import { requireFirestore } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import type { DayKey, DayRecord, Member, RoomMeta, Role } from "./types";

/** 读取房间元信息 */
export async function getRoomMeta(roomId: string): Promise<RoomMeta | null> {
  const database = requireFirestore();
  const snap = await getDoc(doc(database, "rooms", roomId));
  return snap.exists() ? (snap.data() as RoomMeta) : null;
}

/** 创建房间（默认开放加入） */
export async function createRoom(roomId: string, joinCode: string) {
  const meta: RoomMeta = {
    roomId,
    openJoin: true,
    joinCode,
    createdAt: Date.now(),
  };
  const database = requireFirestore();
  await setDoc(doc(database, "rooms", roomId), meta, { merge: true });
  return meta;
}

/** 以参与者身份加入房间（校验加入码） */
export async function joinAsParticipant(
  roomId: string,
  uid: string,
  joinCode: string
) {
  const meta = await getRoomMeta(roomId);
  if (!meta) throw new Error("房间不存在");
  if (!meta.openJoin || meta.joinCode !== joinCode)
    throw new Error("加入码错误或房间未开放加入");

  const m: Member = { uid, role: "participant", createdAt: Date.now() };
  const database = requireFirestore();
  await setDoc(doc(database, "rooms", roomId, "members", uid), m, { merge: true });
  return m;
}

/** 注册指挥官 */
export async function registerCommander(roomId: string, uid: string) {
  const m: Member = { uid, role: "commander", createdAt: Date.now() };
  const database = requireFirestore();
  await setDoc(doc(database, "rooms", roomId, "members", uid), m, { merge: true });
  return m;
}

/** 读取成员信息 */
export async function getMember(
  roomId: string,
  uid: string
): Promise<Member | null> {
  const database = requireFirestore();
  const snap = await getDoc(doc(database, "rooms", roomId, "members", uid));
  return snap.exists() ? (snap.data() as Member) : null;
}

/** 监听房间内所有记录 */
export function watchRecords(
  roomId: string,
  cb: (map: Record<DayKey, DayRecord>) => void,
  onError?: (err: unknown) => void
) {
  const database = requireFirestore();
  const q = query(collection(database, "rooms", roomId, "records"), orderBy("date"));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<DayKey, DayRecord> = {};
      snap.forEach((d) => {
        const v = d.data() as DayRecord;
        map[v.date] = v;
      });
      cb(map);
    },
    (err) => {
      console.error("监听云端记录失败", err);
      onError?.(err);
    }
  );
}

/**
 * 写入单日记录（取消角色限制，所有登录用户可写各字段），并统一附带元数据。
 */
export async function writeRecord(
  roomId: string,
  rec: DayRecord,
  uid: string,
  role: Role
) {
  const database = requireFirestore();
  const ref = doc(database, "rooms", roomId, "records", rec.date);

  // 每次写入都带上元数据
  const meta = {
    updatedByUid: uid,
    updatedByRole: role,
    updatedAt: Date.now(),
  };

  // 仅添加“已定义”的字段，避免把未改动的字段写成 undefined
  const payload: any = { date: rec.date };

  // 参与者可写的字段
  if (rec.meal1 !== undefined) payload.meal1 = rec.meal1;
  if (rec.meal2 !== undefined) payload.meal2 = rec.meal2;
  if (rec.reason !== undefined) payload.reason = rec.reason;
  if (rec.weight !== undefined) {
    const weight = typeof rec.weight === "number" ? rec.weight : Number(rec.weight);
    if (Number.isFinite(weight)) payload.weight = weight;
  }

  // 管理字段（取消角色限制，所有登录用户都可写）
  if (rec.commanderReviewed !== undefined)
    payload.commanderReviewed = rec.commanderReviewed;
  if (rec.rewardGranted !== undefined)
    payload.rewardGranted = rec.rewardGranted;
  if (rec.consequenceExecuted !== undefined)
    payload.consequenceExecuted = rec.consequenceExecuted;

  await setDoc(ref, { ...payload, ...meta }, { merge: true });
}
