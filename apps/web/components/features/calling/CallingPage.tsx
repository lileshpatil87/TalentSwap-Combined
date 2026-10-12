"use client";
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, ShieldCheck } from 'lucide-react';
import { callingApi, type CallingSession } from '@/lib/api/calling';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

type Signal = { type: 'offer' | 'answer' | 'ice-candidate' | 'end'; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
export function CallingPage() {
  const user = useAuthStore((state) => state.user);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const call = useRef<CallingSession | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const [transactionId, setTransactionId] = useState('');
  const [status, setStatus] = useState<'idle'|'connecting'|'connected'|'disconnected'|'error'>('idle');
  const [video, setVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('transactionId'); if (id) setTransactionId(id); }, []);

  const emitSignal = (signal: Signal) => {
    const current = call.current;
    if (current) getSocket('/call').emit('call:signal', { callId: current.id, payload: signal });
  };
  const stop = async (remote = false) => {
    const current = call.current;
    if (current && !remote) {
      emitSignal({ type: 'end' });
      try { await callingApi.end(current.id); } catch { /* ending locally is still safe */ }
    }
    peer.current?.close(); peer.current = null;
    local.current?.getTracks().forEach((track) => track.stop()); local.current = null;
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteRef.current) remoteRef.current.srcObject = null;
    disconnectSocket('/call'); call.current = null; pendingIce.current = [];
    setStatus('disconnected');
  };
  useEffect(() => () => { const activeCall = call.current; if (activeCall) void callingApi.end(activeCall.id).catch(() => undefined); peer.current?.close(); local.current?.getTracks().forEach((track) => track.stop()); disconnectSocket('/call'); }, []);

  const start = async () => {
    if (!transactionId.trim()) { setError('Enter the transaction ID for an active exchange.'); return; }
    setError(''); setStatus('connecting');
    try {
      const session = await callingApi.start(transactionId.trim());
      call.current = session;
      await callingApi.markStarted(session.id);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      local.current = stream; if (localRef.current) localRef.current.srcObject = stream;
      const socket = getSocket('/call');
      const pc = new RTCPeerConnection(); peer.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => { if (remoteRef.current) remoteRef.current.srcObject = event.streams[0]; };
      pc.onicecandidate = (event) => { if (event.candidate) emitSignal({ type: 'ice-candidate', candidate: event.candidate.toJSON() }); };
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') setStatus('connected'); if (['failed','disconnected','closed'].includes(pc.connectionState)) setStatus('disconnected'); };
      socket.on('call:peer-joined', async (event: { callId: string; userId: string }) => {
        if (event.callId !== call.current?.id || event.userId === user?.id || session.initiatorId !== user?.id) return;
        try { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); emitSignal({ type: 'offer', sdp: offer }); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a call offer.'); }
      });
      socket.on('call:signal', async (event: { callId: string; senderId: string; payload: Signal }) => {
        if (event.callId !== call.current?.id || event.senderId === user?.id) return;
        const signal = event.payload;
        try {
          if (signal.type === 'end') { await stop(true); return; }
          if (signal.type === 'offer' && signal.sdp) {
            await pc.setRemoteDescription(signal.sdp);
            for (const candidate of pendingIce.current.splice(0)) await pc.addIceCandidate(candidate);
            const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); emitSignal({ type: 'answer', sdp: answer });
          } else if (signal.type === 'answer' && signal.sdp) {
            await pc.setRemoteDescription(signal.sdp);
            for (const candidate of pendingIce.current.splice(0)) await pc.addIceCandidate(candidate);
          } else if (signal.type === 'ice-candidate' && signal.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate); else pendingIce.current.push(signal.candidate);
          }
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Call signalling failed.'); }
      });
      connectSocket('/call');
      await new Promise<void>((resolve, reject) => {
        if (socket.connected) { resolve(); return; }
        const timer = setTimeout(() => reject(new Error('Could not connect to the calling server.')), 10000);
        socket.once('connect', () => { clearTimeout(timer); resolve(); });
        socket.once('connect_error', (e: Error) => { clearTimeout(timer); reject(e); });
      });
      await new Promise<void>((resolve, reject) => socket.emit('call:join', { callId: session.id }, (ack: { joined?: boolean; error?: string }) => ack?.joined ? resolve() : reject(new Error(ack?.error ?? 'Could not join call.'))));
      // The initiator offers when the other participant joins, so the offer is not lost before the room exists.
      setStatus('connecting');
    } catch (cause) {
      await stop(false); setStatus('error'); setError(cause instanceof Error ? cause.message : 'Unable to start call. Check your transaction ID and camera/microphone permissions.');
    }
  };
  const toggleMute = () => { const track = local.current?.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); } };
  const toggleVideo = () => { const track = local.current?.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setVideo(track.enabled); } };

  return <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8"><div className="mb-6"><h1 className="text-3xl font-semibold">Calling</h1><p className="text-sm text-muted-foreground">Secure WebRTC calling for participants in an active exchange.</p></div>{error && <Alert className="mb-4 border-destructive/30 text-destructive">{error}</Alert>}<div className="mb-4 flex gap-2"><Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Active exchange / transaction ID" aria-label="Transaction ID" disabled={status==='connecting'||status==='connected'}/><Button onClick={() => void start()} disabled={status==='connecting'||status==='connected'||!transactionId.trim()}>Start call</Button></div><Card className="overflow-hidden bg-slate-950 text-white"><div className="relative min-h-[520px] p-4"><video ref={remoteRef} autoPlay playsInline className="h-full min-h-[480px] w-full rounded-lg bg-black object-cover"/><video ref={localRef} muted autoPlay playsInline className="absolute right-7 top-7 h-36 w-56 rounded-lg bg-black object-cover"/><div className="absolute left-7 top-7"><Badge variant={status==='connected'?'success':status==='error'?'destructive':'secondary'}>{status}</Badge></div><div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/70 p-2"><Button variant="secondary" size="icon" disabled={status!=='connected'} onClick={toggleMute} aria-label={muted?'Unmute':'Mute'}>{muted?<MicOff/>:<Mic/>}</Button><Button variant="secondary" size="icon" disabled={status!=='connected'} onClick={toggleVideo} aria-label={video?'Turn video off':'Turn video on'}>{video?<Video/>:<VideoOff/>}</Button>{status==='connected'||status==='connecting'?<Button variant="destructive" size="icon" onClick={() => void stop()} aria-label="End call"><PhoneOff/></Button>:null}</div></div></Card><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success"/>Call signaling validates every participant on the server. Configure TURN servers for reliable connections across restrictive networks.</div></div>;
}
