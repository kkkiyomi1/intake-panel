import { db } from "./firebase";
import {
  doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, updateDoc, serverTimestamp,
  addDoc, getDocs
} from "firebase/firestore";
import type { DayKey, DayRecord, Member, RoomMeta, Role } from "./types";

export async function getRoomMeta(roomId: string): Promise<RoomMeta | null> {
  const snap = await getDoc(doc(db, "rooms", roomId));
  return snap.exists() ? (snap.data() as RoomMeta) : null;
}

export async function createRoom(roomId: string, joinCode: string) {
  const meta: RoomMeta = {
    roomId, openJoin: true, joinCode, createdAt: Date.now()
  };
  await setDoc(doc(db, "rooms", roomId), meta, { merge: true });
  return meta;
}

export async function joinAsParticipant(roomId: string, uid: string, joinCode: string) {
  const meta = await getRoomMeta(roomId);
  if (!meta) throw new Error("房间不存在");
  if (!meta.openJoin || meta.joinCode !== joinCode) throw new Error("加入码错误或房间未开放加入");
  const m: Member = { uid, role: "participant", createdAt: Date.now() };
  await setDoc(doc(db, "rooms", roomId, "members", uid), m, { merge: true });
  return m;
}

export async function registerCommander(roomId: string, uid: string) {
  const m: Member = { uid, role: "commander", createdAt: Date.now() };
  await setDoc(doc(db, "rooms", roomId, "members", uid), m, { merge: true });
  return m;
}

export async function getMember(roomId: string, uid: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, "rooms", roomId, "members", uid));
  return snap.exists() ? (snap.data() as Member) : null;
}

export function watchRecords(roomId: string, cb: (map: Record<DayKey, DayRecord>) => void) {
  const q = query(collection(db, "rooms", roomId, "records"), orderBy("date"));
  return onSnapshot(q, (snap) => {
    const map: Record<DayKey, DayRecord> = {};
    snap.forEach((d) => { const v = d.data() as DayRecord; map[v.date] = v; });
    cb(map);
  });
}

export async function writeRecord(roomId: string, rec: DayRecord, uid: string, role: Role) {
  const ref = doc(db, "rooms", roomId, "records", rec.date);
  await setDoc(ref, { ...rec, updatedByUid: uid, updatedByRole: role, updatedAt: Date.now() }, { merge: true });
}
