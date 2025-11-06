import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, RefreshCcw, Calendar as CalendarIcon, Settings as SettingsIcon, Gift, Gavel, ClipboardCheck, ChevronLeft, ChevronRight, Link as LinkIcon, Printer } from "lucide-react";
import { ensureAnonAuth } from "./firebase";
import { getMonthDates, fmtDate, getWeekdayZh, computeStreaks, groupByWeeks } from "./util";
import type { DayKey, DayRecord, MealEntry, Role, Settings } from "./types";
import { createRoom, getMember, getRoomMeta, joinAsParticipant, registerCommander, watchRecords, writeRecord } from "./cloud";

function classNames(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }

const defaultSettings = (): Settings => {
  const t = new Date();
  return {
    rewardInterval: 7,
    requireCommanderReview: true,
    month: t.getMonth() + 1,
    year: t.getFullYear(),
    majorRewardLabel: "重大奖励",
    consequenceLabel: "惩罚",
  };
};

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("visitor");
  const [joinCode, setJoinCode] = useState<string>("");

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem("intake-settings-v2");
    return saved ? JSON.parse(saved) as Settings : defaultSettings();
  });

  const [cloudEnabled, setCloudEnabled] = useState<boolean>(() => localStorage.getItem("intake-cloud") === "on");
  const [records, setRecords] = useState<Record<DayKey, DayRecord>>({});
  const unsubRef = useRef<() => void>();

  const search = new URLSearchParams(location.search);
  const readonlyMode = search.get("mode") === "readonly";

  // Init auth & maybe restore room from URL
  useEffect(() => {
    ensureAnonAuth().then(setUid);
    const rid = search.get("room");
    if (rid) setRoomId(rid);
  }, []);

  useEffect(() => {
    localStorage.setItem("intake-settings-v2", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!cloudEnabled) { localStorage.setItem("intake-cloud","off"); if (unsubRef.current) unsubRef.current(); return; }
    localStorage.setItem("intake-cloud","on");
    if (!roomId) return;
    // subscribe to cloud records
    unsubRef.current && unsubRef.current();
    unsubRef.current = watchRecords(roomId, (map) => setRecords(map));
    return () => { unsubRef.current && unsubRef.current(); };
  }, [cloudEnabled, roomId]);

  // local storage fallback when cloud is off
  const storageKey = useMemo(() => `intake-local:${settings.year}-${String(settings.month).padStart(2,"0")}`, [settings.year, settings.month]);
  useEffect(() => {
    if (cloudEnabled) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) setRecords(JSON.parse(saved));
    else setRecords({});
  }, [cloudEnabled, storageKey]);
  useEffect(() => {
    if (!cloudEnabled) localStorage.setItem(storageKey, JSON.stringify(records));
  }, [records, cloudEnabled, storageKey]);

  const monthDates = useMemo(() => getMonthDates(settings.year, settings.month), [settings.year, settings.month]);

  function isComplete(k: DayKey) {
    const r = records[k];
    if (!r) return false;
    const mealsOk = r.meal1?.preReported && r.meal1?.postReported && r.meal2?.preReported && r.meal2?.postReported;
    const reviewOk = settings.requireCommanderReview ? !!r.commanderReviewed : true;
    return !!(mealsOk && reviewOk);
  }
  const { streaks, longest } = useMemo(() => computeStreaks(monthDates, isComplete), [monthDates, records, settings.requireCommanderReview]);

  const rewardsDue = useMemo(() => monthDates.filter((k) => isComplete(k) && streaks[k] > 0 && streaks[k] % settings.rewardInterval === 0 && !records[k]?.rewardGranted), [monthDates, streaks, settings.rewardInterval, records]);
  const consequencesDue = useMemo(() => monthDates.filter((k) => !isComplete(k) && !records[k]?.consequenceExecuted), [monthDates, records]);
  const totalCompleteDays = useMemo(() => monthDates.filter(isComplete).length, [monthDates, records]);
  const today = new Date();
  const todayKey = fmtDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  // Write helper (cloud or local)
  async function upsertRecord(k: DayKey, updater: (rec: DayRecord) => void) {
    const cur: DayRecord = records[k] ?? {
      date: k,
      meal1: { preReported: false, postReported: false },
      meal2: { preReported: false, postReported: false },
      commanderReviewed: false,
      rewardGranted: false,
      consequenceExecuted: false,
    };
    const copy: DayRecord = JSON.parse(JSON.stringify(cur));
    updater(copy);
    if (cloudEnabled && roomId && uid) {
      await writeRecord(roomId, copy, uid, role);
    } else {
      setRecords((prev) => ({ ...prev, [k]: copy }));
    }
  }

  // UI role permissions
  const canEditMeals = role !== "visitor" && !readonlyMode;
  const canCommander = role === "commander" && !readonlyMode;
  const canParticipant = role === "participant" && !readonlyMode;

  // Week view / month view toggle
  const [weekView, setWeekView] = useState(false);
  const weeks = useMemo(() => groupByWeeks(monthDates), [monthDates]);

  // Room controls
  async function onCreateRoom() {
    if (!uid) return;
    const rid = prompt("输入房间ID（例如 6-10位小写字母/数字）：") || "";
    if (!rid) return;
    const code = (Math.floor(Math.random()*900000)+100000).toString();
    await createRoom(rid, code);
    await registerCommander(rid, uid);
    setRoomId(rid); setRole("commander"); setJoinCode(code);
    alert(`房间已创建！房间ID：${rid}\n加入码：${code}\n把这两项发给她即可加入（手机端零登录）。`);
    const url = new URL(location.href); url.searchParams.set("room", rid); history.replaceState(null,"",url.toString());
  }

  async function onJoinRoom(as: "participant"|"commander") {
    if (!uid) return;
    const rid = prompt("输入房间ID：") || "";
    if (!rid) return;
    if (as === "participant") {
      const code = prompt("输入加入码：") || "";
      try {
        await joinAsParticipant(rid, uid, code);
        setRoomId(rid); setRole("participant"); setJoinCode(code);
        const url = new URL(location.href); url.searchParams.set("room", rid); history.replaceState(null,"",url.toString());
      } catch (e: any) { alert(e.message || String(e)); }
    } else {
      // commander self-register (assumes you已经知晓房间ID并有权限)
      await registerCommander(rid, uid);
      setRoomId(rid); setRole("commander");
      const meta = await getRoomMeta(rid); setJoinCode(meta?.joinCode || "");
      const url = new URL(location.href); url.searchParams.set("room", rid); history.replaceState(null,"",url.toString());
    }
  }

  function shiftMonth(delta: number) {
    const d = new Date(settings.year, settings.month - 1 + delta, 1);
    setSettings((s) => ({ ...s, year: d.getFullYear(), month: d.getMonth() + 1 }));
  }

  function exportJSON() {
    const payload = { settings, records };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `intake-${settings.year}-${String(settings.month).padStart(2,"0")}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
        if (data.records) setRecords(data.records);
      } catch { alert("导入失败：JSON 格式不正确"); }
    };
    reader.readAsText(file);
  }

  function resetMonth() {
    if (!confirm("确定要清空当前月份所有记录吗？")) return;
    setRecords({});
  }

  // Top share links
  const shareUrl = useMemo(() => {
    const url = new URL(location.href);
    if (roomId) url.searchParams.set("room", roomId);
    else url.searchParams.delete("room");
    url.searchParams.delete("mode");
    return url.toString();
  }, [roomId]);
  const readonlyUrl = useMemo(() => {
    const url = new URL(shareUrl);
    url.searchParams.set("mode","readonly");
    return url.toString();
  }, [shareUrl]);

  // Render
  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Top bar */}
        <div className="mb-4 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-5 w-5" /></Button>
            <Badge className="text-base px-3 py-1" variant="secondary">
              <CalendarIcon className="mr-2 h-4 w-4" /> {settings.year} 年 {settings.month} 月
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)}><ChevronRight className="h-5 w-5" /></Button>

            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">周视图</span>
              <Switch checked={weekView} onCheckedChange={setWeekView} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportJSON}><Download className="mr-2 h-4 w-4" /> 导出 JSON</Button>
            <label className="cursor-pointer">
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
              <span><Button variant="outline"><Upload className="mr-2 h-4 w-4" /> 导入 JSON</Button></span>
            </label>
            <Button variant="outline" onClick={resetMonth}><RefreshCcw className="mr-2 h-4 w-4" /> 清空本月</Button>

            <Button variant="outline" onClick={() => window.open(shareUrl, "_blank")} title="分享可编辑链接（取决于对方角色）">
              <LinkIcon className="mr-2 h-4 w-4" /> 分享链接
            </Button>
            <Button variant="outline" onClick={() => window.open(readonlyUrl, "_blank")} title="分享只读/打印链接">
              <Printer className="mr-2 h-4 w-4" /> 只读/打印
            </Button>

            <SettingsPanel settings={settings} setSettings={setSettings} readonly={readonlyMode} />
          </div>
        </div>

        {/* Cloud/Room bar */}
        <div className="mb-6 grid gap-3 md:grid-cols-3 no-print">
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">云同步</div>
              <div className="text-lg font-semibold">{cloudEnabled ? "已开启" : "关闭（本地存储）"}</div>
            </div>
            <Switch checked={cloudEnabled} onCheckedChange={setCloudEnabled} />
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">房间</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{roomId || "未加入"}</Badge>
              <Badge>{role}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={onCreateRoom}>创建房间（Commander）</Button>
              <Button variant="outline" onClick={() => onJoinRoom("participant")}>加入房间（参与者）</Button>
              <Button variant="outline" onClick={() => onJoinRoom("commander")}>加入房间（Commander）</Button>
            </div>
            {role !== "visitor" && joinCode && <div className="mt-2 text-xs text-gray-600">加入码：{joinCode}</div>}
          </CardContent></Card>

          <StatsPanel settings={settings} dates={monthDates} records={records} isComplete={isComplete} streaks={streaks} />
        </div>

        {/* Content */}
        {weekView ? (
          <WeekGrid dates={monthDates} weeks={groupByWeeks(monthDates)} {...{ records, setRecords, isComplete, streaks, settings, role, readonlyMode, upsertRecord }} />
        ) : (
          <MonthGrid dates={monthDates} {...{ records, setRecords, isComplete, streaks, settings, role, readonlyMode, upsertRecord }} />
        )}
      </div>
    </div>
  );
}

function StatsPanel({ settings, dates, records, isComplete, streaks }: { settings: Settings; dates: DayKey[]; records: Record<DayKey, DayRecord>; isComplete: (k: DayKey) => boolean; streaks: Record<DayKey, number>; }) {
  const totalComplete = dates.filter(isComplete).length;
  const longest = Math.max(0, ...Object.values(streaks || {}));
  const rewardsDue = dates.filter((k) => isComplete(k) && streaks[k] > 0 && streaks[k] % settings.rewardInterval === 0 && !records[k]?.rewardGranted).length;
  const consequencesDue = dates.filter((k) => !isComplete(k) && !records[k]?.consequenceExecuted).length;

  return (
    <Card><CardContent className="p-4 grid grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-gray-500 mb-1">累计完成</div>
        <div className="text-lg font-semibold">{totalComplete}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1">未完成</div>
        <div className="text-lg font-semibold">{dates.length - totalComplete}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1">最长连续</div>
        <div className="text-lg font-semibold">{longest}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1">{settings.majorRewardLabel}待发放</div>
        <div className="text-lg font-semibold">{rewardsDue}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500 mb-1">{settings.consequenceLabel}待执行</div>
        <div className="text-lg font-semibold">{consequencesDue}</div>
      </div>
    </CardContent></Card>
  );
}

function MonthGrid({ dates, records, setRecords, isComplete, streaks, settings, role, readonlyMode, upsertRecord }:
  { dates: DayKey[]; records: Record<DayKey, DayRecord>; setRecords: any; isComplete: (k: DayKey) => boolean; streaks: Record<DayKey, number>; settings: Settings; role: Role; readonlyMode: boolean; upsertRecord: (k: DayKey, updater: (rec: DayRecord)=>void) => void; }) {
  const today = new Date();
  const todayKey = fmtDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dates.map((k) => {
        const rec = records[k];
        const complete = isComplete(k);
        const streak = streaks[k] ?? 0;
        const rewardDue = complete && streak > 0 && streak % settings.rewardInterval === 0 && !rec?.rewardGranted;
        const consequenceDue = !complete && !rec?.consequenceExecuted;
        const isToday = k === todayKey;
        return (
          <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className={classNames("border", complete ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50", rewardDue && "ring-2 ring-amber-300")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {k} <span className="ml-2 text-gray-500">{getWeekdayZh(k)}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isToday && <Badge variant="secondary">今天</Badge>}
                    {complete ? <Badge className="bg-emerald-600">完成</Badge> : <Badge className="bg-rose-600">未完成</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <MealCard
                  label="餐次 1" rec={rec?.meal1}
                  onChange={(m) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.meal1 = m; })}
                />
                <MealCard
                  label="餐次 2" rec={rec?.meal2}
                  onChange={(m) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.meal2 = m; })}
                />
                <CommanderBar
                  streak={streak}
                  showReason={!complete}
                  reason={rec?.reason || ""}
                  onReason={(val) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.reason = val; })}
                  commanderReviewed={!!rec?.commanderReviewed}
                  onReviewed={(val) => canEdit(role, readonlyMode, "commander") && upsertRecord(k, (r) => { r.commanderReviewed = val; })}
                  rewardGranted={!!rec?.rewardGranted} rewardDue={rewardDue}
                  onReward={() => canEdit(role, readonlyMode, "commander") && upsertRecord(k, (r) => { r.rewardGranted = true; })}
                  consequenceExecuted={!!rec?.consequenceExecuted} consequenceDue={consequenceDue}
                  onConsequence={() => canEdit(role, readonlyMode, "commander") && upsertRecord(k, (r) => { r.consequenceExecuted = true; })}
                />
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function WeekGrid({ dates, weeks, records, setRecords, isComplete, streaks, settings, role, readonlyMode, upsertRecord }:
  { dates: DayKey[]; weeks: DayKey[][]; records: Record<DayKey, DayRecord>; setRecords: any; isComplete: (k: DayKey) => boolean; streaks: Record<DayKey, number>; settings: Settings; role: Role; readonlyMode: boolean; upsertRecord: (k: DayKey, updater: (rec: DayRecord)=>void) => void; }) {
  return (
    <div className="space-y-6">
      {weeks.map((wk, idx) => (
        <div key={idx} className="rounded-2xl bg-white border shadow-sm p-3">
          <div className="mb-2 font-semibold">第 {idx + 1} 周</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {wk.map((k) => {
              const rec = records[k];
              const complete = isComplete(k);
              const streak = streaks[k] ?? 0;
              const rewardDue = complete && streak > 0 && streak % settings.rewardInterval === 0 && !rec?.rewardGranted;
              const consequenceDue = !complete && !rec?.consequenceExecuted;
              return (
                <div key={k} className={classNames("rounded-xl border p-3", complete ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50")}>
                  <div className="mb-2 text-sm font-medium">{k}</div>
                  <div className="space-y-2">
                    <TinyToggle label="餐1 前" checked={!!rec?.meal1?.preReported} onChange={(v) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.meal1 = { ...(r.meal1||{preReported:false,postReported:false}), preReported: v }; })} />
                    <TinyToggle label="餐1 后" checked={!!rec?.meal1?.postReported} onChange={(v) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.meal1 = { ...(r.meal1||{preReported:false,postReported:false}), postReported: v }; })} />
                    <TinyToggle label="餐2 前" checked={!!rec?.meal2?.preReported} onChange={(v) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.meal2 = { ...(r.meal2||{preReported:false,postReported:false}), preReported: v }; })} />
                    <TinyToggle label="餐2 后" checked={!!rec?.meal2?.postReported} onChange={(v) => canEdit(role, readonlyMode, "meals") && upsertRecord(k, (r) => { r.meal2 = { ...(r.meal2||{preReported:false,postReported:false}), postReported: v }; })} />
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">连 {streak}</Badge>
                      {rewardDue && <Badge className="bg-amber-600">奖</Badge>}
                      {consequenceDue && <Badge variant="destructive">罚</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MealCard({ label, rec, onChange }: { label: string; rec?: MealEntry; onChange: (m: MealEntry) => void; }) {
  const v = rec ?? { preReported: false, postReported: false };
  return (
    <div className="rounded-xl bg-white/70 p-3 border">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium">{label}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ClipboardCheck className="h-4 w-4" /><span>打勾：前后均汇报</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ToggleField label="进食前已汇报" checked={!!v.preReported} onChange={(val) => onChange({ ...v, preReported: val })} />
        <ToggleField label="进食后已汇报" checked={!!v.postReported} onChange={(val) => onChange({ ...v, postReported: val })} />
        <Input placeholder="前-时间 HH:MM" value={v.preTime || ""} onChange={(e) => onChange({ ...v, preTime: e.target.value })} />
        <Input placeholder="后-时间 HH:MM" value={v.postTime || ""} onChange={(e) => onChange({ ...v, postTime: e.target.value })} />
      </div>
      <div className="mt-2">
        <Input placeholder="食物内容（可选）" value={v.note || ""} onChange={(e) => onChange({ ...v, note: e.target.value })} />
      </div>
    </div>
  );
}

function CommanderBar(props: {
  streak: number;
  showReason: boolean;
  reason: string;
  onReason: (val: string) => void;
  commanderReviewed: boolean;
  onReviewed: (val: boolean) => void;
  rewardGranted: boolean;
  rewardDue: boolean;
  onReward: () => void;
  consequenceExecuted: boolean;
  consequenceDue: boolean;
  onConsequence: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Switch checked={props.commanderReviewed} onCheckedChange={props.onReviewed} />
        <span className="text-sm">Commander 复核</span>
        <Badge variant="secondary">连续：{props.streak}</Badge>
      </div>
      {props.showReason && (
        <Input placeholder="未完成原因（可选）" value={props.reason} onChange={(e) => props.onReason(e.target.value)} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={props.onReward} disabled={!props.rewardDue} className={classNames(!props.rewardDue && "opacity-60 cursor-not-allowed")}>
          <Gift className="mr-2 h-4 w-4" /> 标记“重大奖励”已发放
        </Button>
        {props.rewardGranted && <Badge className="bg-amber-600">已发放</Badge>}
        <Button size="sm" variant="destructive" onClick={props.onConsequence} disabled={!props.consequenceDue} className={classNames(!props.consequenceDue && "opacity-60 cursor-not-allowed")}>
          <Gavel className="mr-2 h-4 w-4" /> 标记“惩罚”已执行
        </Button>
        {props.consequenceExecuted && <Badge variant="destructive">已执行</Badge>}
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
      <Switch checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function canEdit(role: Role, readonly: boolean, area: "meals" | "commander") {
  if (readonly) return false;
  if (area === "meals") return role === "participant" || role === "commander";
  if (area === "commander") return role === "commander";
  return false;
}

function SettingsPanel({ settings, setSettings, readonly }: { settings: Settings; setSettings: React.Dispatch<React.SetStateAction<Settings>>; readonly: boolean; }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button onClick={() => setOpen((v) => !v)} disabled={readonly}><SettingsIcon className="mr-2 h-4 w-4" /> 设置</Button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 z-20 mt-2 w-[360px] rounded-2xl border bg-white p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">重大奖励触发间隔（天）</div>
              <Input type="number" min={1} value={settings.rewardInterval} onChange={(e) => setSettings((s) => ({ ...s, rewardInterval: Math.max(1, Number(e.target.value || 1)) }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">需要 Commander 复核</div>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch checked={settings.requireCommanderReview} onCheckedChange={(v) => setSettings((s) => ({ ...s, requireCommanderReview: Boolean(v) }))} />
                <span className="text-sm">开启</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">重大奖励标签</div>
              <Input value={settings.majorRewardLabel} onChange={(e) => setSettings((s) => ({ ...s, majorRewardLabel: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">惩罚标签</div>
              <Input value={settings.consequenceLabel} onChange={(e) => setSettings((s) => ({ ...s, consequenceLabel: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">年份</div>
              <Input type="number" value={settings.year} onChange={(e) => setSettings((s) => ({ ...s, year: Number(e.target.value || s.year) }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">月份</div>
              <div className="relative">
                <div className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm flex items-center cursor-pointer" onClick={() => {
                  const v = prompt("输入月份(1-12)：");
                  if (!v) return; const m = Math.max(1, Math.min(12, Number(v))); setSettings((s)=>({ ...s, month: m }));
                }}>{settings.month}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
