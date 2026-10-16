// Reliable host-to-member channels. Signaling contains no character or world data.
export const ROOM_VERSION = 1;
export const ROOM_LIMIT = 10;
const MAX_MESSAGE = 4 * 1024 * 1024, MAX_QUEUE = 8 * 1024 * 1024, CHUNK = 8000;
const bytes = value => new TextEncoder().encode(value).length;
export class RoomTransport {
  constructor({serverURL = '/signal', iceServers = [], onMessage, onPeer, onClose, onError} = {}) {
    const url = new URL(serverURL, globalThis.location?.href || 'http://localhost/');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('配對網址必須是 HTTP(S) 網址');
    if (globalThis.location?.protocol === 'https:' && url.protocol !== 'https:') throw Error('HTTPS 遊戲需要 HTTPS 配對網址');
    this.serverURL = url.href.endsWith('/') ? url.href.slice(0, -1) : url.href; this.iceServers = iceServers;
    this.onMessage = onMessage; this.onPeer = onPeer; this.onClose = onClose; this.onError = onError;
    this._links = new Map(); this._closed = true; this._cursor = 0; this._epoch = 0;
  }
  get peers() { return [...this._links.values()].filter(row => row.open).map(row => row.id); }
  async host() { return this._enter(); }
  async join(code) {
    code = String(code).trim().toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(code)) throw Error('請輸入 12 位房號');
    return this._enter(code);
  }
  async _request(path, body, {anonymous = false, keepalive = false, token = this._token} = {}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(this.serverURL + path, {method: body ? 'POST' : 'GET', headers: {...(body ? {'Content-Type': 'application/json'} : {}), ...(!anonymous ? {Authorization: 'Bearer ' + token} : {})}, ...(body ? {body: JSON.stringify({version: ROOM_VERSION, ...body})} : {}), signal: controller.signal, cache: 'no-store', credentials: 'omit', keepalive});
      const data = await response.json();
      if (!response.ok) throw Object.assign(Error(data.error || '配對服務無法使用'), {status: response.status});
      return data;
    } finally { clearTimeout(timer); }
  }
  async _enter(code) {
    if (!this._closed || this._joining) throw Error('已在房間中');
    if (!globalThis.RTCPeerConnection) throw Error('此瀏覽器不支援 WebRTC 連線');
    this._joining = true; const epoch = ++this._epoch;
    try {
      const result = await this._request(code ? '/rooms/' + code + '/join' : '/rooms', {}, {anonymous: true});
      if (epoch !== this._epoch) { await this._request('/rooms/' + result.code + '/leave', {}, {token: result.token}).catch(() => {}); throw Error('已取消加入房間'); }
      if (result.version !== ROOM_VERSION || !result.token || !result.id || result.hostId !== 'host') throw Error('配對版本不相容');
      this.id = result.id; this.hostId = result.hostId; this.code = result.code; this.isHost = this.id === this.hostId; this._token = result.token;
      this._closed = false; this._cursor = 0; this._lastSignalAt = Date.now();
      if (!this.isHost) this._makePeer(this.hostId);
      this._poll();
      return {version: ROOM_VERSION, code: this.code, id: this.id, hostId: this.hostId};
    } catch (error) {
      if (!this._closed) await this.close('無法啟動連線');
      throw error;
    } finally { this._joining = false; }
  }
  async _poll(epoch = this._epoch) {
    if (this._closed || epoch !== this._epoch) return;
    try {
      const result = await this._request('/rooms/' + this.code + '/poll?after=' + this._cursor);
      if (this._closed || epoch !== this._epoch) return;
      if (result.version !== ROOM_VERSION || !Array.isArray(result.events)) throw Object.assign(Error('配對版本不相容'), {status: 409});
      this._lastSignalAt = Date.now();
      for (const event of result.events) {
        if (this._closed || epoch !== this._epoch) return;
        if (event.seq <= this._cursor) continue;
        if (event.type === 'join' && this.isHost) await this._offer(event.id);
        else if (event.type === 'leave') this._drop(event.id, event.reason);
        else if (event.type === 'signal') await this._signal(event.from, event.signal);
        if (this._closed || epoch !== this._epoch) return;
        this._cursor = event.seq;
      }
    } catch (error) {
      if (this._closed || epoch !== this._epoch) return;
      if ([403, 409, 410].includes(error.status) || Date.now() - this._lastSignalAt >= 15000) { await this.close(error.message); return; }
      this.onError?.(error);
    }
    if (!this._closed && epoch === this._epoch) this._pollTimer = setTimeout(() => this._poll(epoch), 1000);
  }
  _makePeer(id) {
    if (this._links.has(id)) return this._links.get(id);
    if (this._links.size >= ROOM_LIMIT - 1 || (!this.isHost && id !== this.hostId)) throw Error('房間人數或連線對象不正確');
    const pc = new RTCPeerConnection({iceServers: this.iceServers});
    const row = {id, pc, open: false, queue: [], queuedBytes: 0, tx: 0, rx: 0, candidates: [], receivedAt: Date.now(), receivedBytes: 0};
    this._links.set(id, row);
    row.timeout = setTimeout(() => this.disconnect(id, '連線逾時；請確認同一 Wi-Fi 沒有隔離裝置'), 20000);
    pc.onicecandidate = event => this._postSignal(id, {type: 'candidate', candidate: event.candidate?.toJSON() || null});
    pc.ondatachannel = event => this._attach(row, event.channel);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.disconnect(id, '連線已中斷');
      else if (pc.connectionState === 'disconnected') row.disconnected ||= setTimeout(() => this.disconnect(id, '連線已中斷'), 5000);
      else if (pc.connectionState === 'connected') { clearTimeout(row.disconnected); row.disconnected = null; }
    };
    return row;
  }
  async _postSignal(to, signal) {
    if (this._closed || !this._links.has(to)) return;
    const row = this._links.get(to);
    try { await this._request('/rooms/' + this.code + '/signal', {to, signal}); }
    catch (error) { if (!this._closed && this._links.get(to) === row) { this.onError?.(error); await this.disconnect(to, '配對中斷'); } }
  }
  async _offer(id) {
    if (this._links.has(id)) return;
    const row = this._makePeer(id);
    this._attach(row, row.pc.createDataChannel('lineage-dream', {ordered: true, protocol: 'lineage-dream-v1'}));
    await row.pc.setLocalDescription(await row.pc.createOffer());
    await this._postSignal(id, {type: 'offer', sdp: row.pc.localDescription.sdp});
  }
  async _signal(id, signal) {
    if (!this.isHost && id !== this.hostId) throw Error('非法房間來源');
    const row = this._links.get(id); if (!row) return;
    if (signal.type === 'candidate') {
      if (!row.pc.remoteDescription) row.candidates.push(signal.candidate);
      else await row.pc.addIceCandidate(signal.candidate);
    } else {
      if (signal.type !== (this.isHost ? 'answer' : 'offer')) throw Error('配對方向不正確');
      await row.pc.setRemoteDescription({type: signal.type, sdp: signal.sdp});
      for (const candidate of row.candidates.splice(0)) await row.pc.addIceCandidate(candidate);
      if (!this.isHost) { await row.pc.setLocalDescription(await row.pc.createAnswer()); await this._postSignal(id, {type: 'answer', sdp: row.pc.localDescription.sdp}); }
    }
  }
  _attach(row, channel) {
    if (row.channel || channel.label !== 'lineage-dream' || channel.protocol !== 'lineage-dream-v1') { channel.close(); this.disconnect(row.id, '連線通道版本不相容'); return; }
    row.channel = channel; channel.bufferedAmountLowThreshold = 128 * 1024;
    channel.onopen = () => { if (this._closed || !this._links.has(row.id)) return; clearTimeout(row.timeout); row.open = true; this.onPeer?.({id: row.id, state: 'open'}); this._flush(row); };
    channel.onclose = () => this.disconnect(row.id, '連線已中斷');
    channel.onerror = () => this.disconnect(row.id, '連線傳輸錯誤');
    channel.onbufferedamountlow = () => this._flush(row);
    channel.onmessage = event => {
      try {
        if (typeof event.data !== 'string' || bytes(event.data) > 65536) throw Error('連線訊息格式不正確');
        if (Date.now() - row.receivedAt >= 10000) { row.receivedAt = Date.now(); row.receivedBytes = 0; }
        row.receivedBytes += bytes(event.data); if (row.receivedBytes > 32 * 1024 * 1024) throw Error('連線訊息過於頻繁');
        const part = JSON.parse(event.data);
        if (part.v !== ROOM_VERSION || !Number.isSafeInteger(part.n) || part.n !== row.rx + 1 || !Number.isInteger(part.i) || !Number.isInteger(part.total) || part.total < 1 || part.total > Math.ceil(MAX_MESSAGE / CHUNK) || typeof part.data !== 'string' || part.data.length > CHUNK) throw Error('連線訊息版本或順序不正確');
        if (!row.assembly) { if (part.i !== 0) throw Error('缺少連線訊息'); row.assembly = {parts: [], total: part.total, bytes: 0}; row.assemblyTimer = setTimeout(() => this.disconnect(row.id, '接收資料逾時'), 15000); }
        const current = row.assembly;
        if (part.i !== current.parts.length || part.total !== current.total) throw Error('連線訊息順序不正確');
        current.bytes += bytes(part.data); if (current.bytes > MAX_MESSAGE) throw Error('連線資料過大');
        current.parts.push(part.data);
        if (current.parts.length === current.total) { clearTimeout(row.assemblyTimer); row.assembly = null; row.rx = part.n; this.onMessage?.(JSON.parse(current.parts.join('')), row.id); }
      } catch (error) { this.onError?.(error); this.disconnect(row.id, error.message); }
    };
  }
  _flush(row) {
    if (!row.open || row.channel?.readyState !== 'open') return;
    try { while (row.queue.length && row.channel.bufferedAmount < 256 * 1024) { const part = row.queue.shift(); row.queuedBytes -= bytes(part); row.channel.send(part); } }
    catch (error) { this.onError?.(error); this.disconnect(row.id, '資料傳送失敗'); }
  }
  send(data, to = this.hostId) {
    const row = this._links.get(to); if (this._closed || !row?.open) return false;
    const text = JSON.stringify(data); if (typeof text !== 'string' || bytes(text) > MAX_MESSAGE) throw Error('連線資料不能超過 4 MiB');
    const total = Math.ceil(text.length / CHUNK), n = row.tx + 1;
    const parts = Array.from({length: total}, (_, i) => JSON.stringify({v: ROOM_VERSION, n, i, total, data: text.slice(i * CHUNK, (i + 1) * CHUNK)}));
    const size = parts.reduce((sum, part) => sum + bytes(part), 0);
    if (row.queuedBytes + row.channel.bufferedAmount + size > MAX_QUEUE) { this.onError?.(Error('連線壅塞，等待已送出的資料確認')); return false; }
    row.tx = n; row.queue.push(...parts); row.queuedBytes += size; this._flush(row); return this._links.has(to);
  }
  to(id, data) { return this.send(data, id); }
  broadcast(data) { if (!this.isHost) throw Error('只有房主可以廣播'); let sent = true; for (const id of this.peers) sent = this.send(data, id) && sent; return sent; }
  _drop(id, reason) {
    const row = this._links.get(id); if (!row) return;
    this._links.delete(id); clearTimeout(row.timeout); clearTimeout(row.disconnected); clearTimeout(row.assemblyTimer);
    row.pc.onconnectionstatechange = row.pc.onicecandidate = row.pc.ondatachannel = null;
    if (row.channel) { row.channel.onclose = row.channel.onerror = row.channel.onmessage = row.channel.onopen = row.channel.onbufferedamountlow = null; row.channel.close(); }
    row.pc.close(); if (row.open) this.onPeer?.({id, state: 'close', reason});
  }
  async disconnect(id, reason = 'removed') {
    if (!this._links.has(id)) return;
    if (!this.isHost) { await this.close(reason); return; }
    this._drop(id, reason);
    if (!this._closed) try { await this._request('/rooms/' + this.code + '/kick', {id}); } catch {}
  }
  async close(reason = 'left') {
    ++this._epoch;
    if (this._closed) return;
    const code = this.code, token = this._token; this._token = null;
    this._closed = true; clearTimeout(this._pollTimer);
    for (const id of this._links.keys()) this._drop(id, reason);
    this.onClose?.(reason);
    try { await this._request('/rooms/' + code + '/leave', {}, {keepalive: true, token}); } catch {}
  }
}
