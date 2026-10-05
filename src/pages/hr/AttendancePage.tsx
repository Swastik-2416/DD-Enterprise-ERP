import { useState, useMemo, useEffect } from 'react'
import {
  UserCheck, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock, Users,
  Printer, Trash2, Edit3, Download,
  X, AlertCircle, IndianRupee, ShieldCheck,
  UserX, UserMinus, Factory, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, toInputDate, formatCurrency } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { DailyMusterPrintModal } from '@/components/hr/DailyMusterPrintModal'
import {
  type Worker,
  type DailyAttendanceRecord,
  type FactoryDepartment,
  type WorkerSkill,
  type AttendanceStatus,
  SEED_WORKERS
} from '@/types/hr.types'

const LS_WORKERS_KEY = 'dd_workers_roster'
const LS_ATTENDANCE_KEY = 'dd_attendance_records'

const DEPARTMENTS: FactoryDepartment[] = [
  'Vibro Press Machine Line',
  'Batching Plant & Mixing',
  'Forklift & Yard Tractor',
  'Curing Sheds & Mist Spraying',
  'Stacking, Palletizing & Loading',
  'Plant Maintenance & Welding',
  'Factory Security & Gate'
]

function loadStoredWorkers(): Worker[] {
  try {
    const raw = localStorage.getItem(LS_WORKERS_KEY)
    if (!raw) {
      localStorage.setItem(LS_WORKERS_KEY, JSON.stringify(SEED_WORKERS))
      return SEED_WORKERS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_WORKERS
  } catch {
    return SEED_WORKERS
  }
}

function saveStoredWorkers(workers: Worker[]) {
  try {
    localStorage.setItem(LS_WORKERS_KEY, JSON.stringify(workers))
  } catch {}
}

function loadStoredAttendance(): DailyAttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LS_ATTENDANCE_KEY)
    if (!raw) return []
    return JSON.parse(raw) || []
  } catch {
    return []
  }
}

function saveStoredAttendance(records: DailyAttendanceRecord[]) {
  try {
    localStorage.setItem(LS_ATTENDANCE_KEY, JSON.stringify(records))
  } catch {}
}

export function AttendancePage() {
  const { user } = useAuth()
  const [workers, setWorkers] = useState<Worker[]>(loadStoredWorkers)
  const [allAttendance, setAllAttendance] = useState<DailyAttendanceRecord[]>(loadStoredAttendance)

  const [selectedDate, setSelectedDate] = useState<string>(toInputDate(new Date()))
  const [selectedShift, setSelectedShift] = useState<DailyAttendanceRecord['shift']>('Morning Shift (6 AM - 2 PM)')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)

  // Worker Form Fields
  const [workerName, setWorkerName] = useState('')
  const [workerPhone, setWorkerPhone] = useState('')
  const [workerDept, setWorkerDept] = useState<FactoryDepartment>('Vibro Press Machine Line')
  const [workerSkill, setWorkerSkill] = useState<WorkerSkill>('Semi-Skilled')
  const [workerWage, setWorkerWage] = useState<number>(700)
  const [workerOtRate, setWorkerOtRate] = useState<number>(90)
  const [workerAadhaar, setWorkerAadhaar] = useState('')

  // 1. Get or Initialize Attendance Records for Selected Date and Shift
  const currentRecords = useMemo(() => {
    const existingForSlot = allAttendance.filter(
      a => a.date === selectedDate && a.shift === selectedShift
    )

    // Build map of existing records
    const map = new Map<string, DailyAttendanceRecord>()
    existingForSlot.forEach(r => map.set(r.worker_id, r))

    // For active workers not yet logged for this date/shift, initialize default records
    const activeWorkers = workers.filter(w => w.is_active)
    const result: DailyAttendanceRecord[] = activeWorkers.map(w => {
      if (map.has(w.id)) {
        return map.get(w.id)!
      }

      // Default to present
      const baseWage = w.daily_wage_rate
      return {
        id: `att-${selectedDate}-${w.id}-${selectedShift.slice(0, 3)}`,
        date: selectedDate,
        shift: selectedShift,
        worker_id: w.id,
        worker_name: w.name,
        department: w.department,
        status: 'present',
        ot_hours: 0,
        daily_wage: baseWage,
        ot_amount: 0,
        total_earned: baseWage,
        notes: ''
      }
    })

    return result
  }, [allAttendance, workers, selectedDate, selectedShift])

  // Update a single worker's attendance in the muster
  const handleUpdateRecord = (workerId: string, updates: Partial<DailyAttendanceRecord>) => {
    const updatedSlot = currentRecords.map(rec => {
      if (rec.worker_id !== workerId) return rec

      const newStatus = updates.status !== undefined ? updates.status : rec.status
      const newOtHours = updates.ot_hours !== undefined ? updates.ot_hours : rec.ot_hours
      const worker = workers.find(w => w.id === workerId)
      const baseDailyRate = worker ? worker.daily_wage_rate : rec.daily_wage
      const hourlyOtRate = worker ? worker.hourly_ot_rate : 100

      let earnedDaily = 0
      if (newStatus === 'present') earnedDaily = baseDailyRate
      else if (newStatus === 'half_day') earnedDaily = Math.round(baseDailyRate / 2)
      else earnedDaily = 0

      const otAmount = Math.round(newOtHours * hourlyOtRate)
      const totalEarned = earnedDaily + otAmount

      return {
        ...rec,
        ...updates,
        status: newStatus,
        ot_hours: newOtHours,
        daily_wage: baseDailyRate,
        ot_amount: otAmount,
        total_earned: totalEarned
      }
    })

    // Merge into allAttendance
    const otherRecords = allAttendance.filter(
      a => !(a.date === selectedDate && a.shift === selectedShift)
    )
    const newAll = [...otherRecords, ...updatedSlot]
    setAllAttendance(newAll)
    saveStoredAttendance(newAll)
  }

  // Quick Action: Mark All Present
  const handleMarkAll = (status: AttendanceStatus) => {
    const updatedSlot = currentRecords.map(rec => {
      const worker = workers.find(w => w.id === rec.worker_id)
      const baseDailyRate = worker ? worker.daily_wage_rate : rec.daily_wage
      const hourlyOtRate = worker ? worker.hourly_ot_rate : 100

      let earnedDaily = 0
      if (status === 'present') earnedDaily = baseDailyRate
      else if (status === 'half_day') earnedDaily = Math.round(baseDailyRate / 2)
      else earnedDaily = 0

      const otAmount = Math.round(rec.ot_hours * hourlyOtRate)
      const totalEarned = earnedDaily + otAmount

      return {
        ...rec,
        status,
        daily_wage: baseDailyRate,
        ot_amount: otAmount,
        total_earned: totalEarned
      }
    })

    const otherRecords = allAttendance.filter(
      a => !(a.date === selectedDate && a.shift === selectedShift)
    )
    const newAll = [...otherRecords, ...updatedSlot]
    setAllAttendance(newAll)
    saveStoredAttendance(newAll)
    toast.success(`Marked all active workers as ${status.replace('_', ' ')}`)
  }

  // Worker Form Handlers
  const handleOpenNewWorker = () => {
    setEditingWorker(null)
    setWorkerName('')
    setWorkerPhone('')
    setWorkerDept('Vibro Press Machine Line')
    setWorkerSkill('Semi-Skilled')
    setWorkerWage(700)
    setWorkerOtRate(90)
    setWorkerAadhaar('')
    setIsWorkerModalOpen(true)
  }

  const handleEditWorker = (w: Worker) => {
    setEditingWorker(w)
    setWorkerName(w.name)
    setWorkerPhone(w.phone || '')
    setWorkerDept(w.department)
    setWorkerSkill(w.skill_level)
    setWorkerWage(w.daily_wage_rate)
    setWorkerOtRate(w.hourly_ot_rate)
    setWorkerAadhaar(w.aadhaar_last4 || '')
    setIsWorkerModalOpen(true)
  }

  const handleSaveWorker = () => {
    if (!workerName.trim()) {
      toast.error('Worker name is required')
      return
    }
    if (workerWage <= 0) {
      toast.error('Daily wage rate must be greater than 0')
      return
    }

    if (editingWorker) {
      const updated: Worker = {
        ...editingWorker,
        name: workerName.trim(),
        phone: workerPhone.trim() || undefined,
        department: workerDept,
        skill_level: workerSkill,
        daily_wage_rate: Number(workerWage) || 0,
        hourly_ot_rate: Number(workerOtRate) || 0,
        aadhaar_last4: workerAadhaar.trim() || undefined
      }
      const newWorkers = workers.map(w => w.id === editingWorker.id ? updated : w)
      setWorkers(newWorkers)
      saveStoredWorkers(newWorkers)
      toast.success(`Worker ${updated.name} updated`)
    } else {
      const seq = workers.length + 1
      const newCode = `WKR-${String(seq).padStart(3, '0')}`
      const newWorker: Worker = {
        id: crypto.randomUUID(),
        worker_code: newCode,
        name: workerName.trim(),
        phone: workerPhone.trim() || undefined,
        department: workerDept,
        skill_level: workerSkill,
        daily_wage_rate: Number(workerWage) || 0,
        hourly_ot_rate: Number(workerOtRate) || 0,
        aadhaar_last4: workerAadhaar.trim() || undefined,
        is_active: true,
        joined_date: toInputDate(new Date())
      }
      const newWorkers = [...workers, newWorker]
      setWorkers(newWorkers)
      saveStoredWorkers(newWorkers)
      toast.success(`Worker ${newWorker.name} added to factory muster`)
    }

    setIsWorkerModalOpen(false)
    setEditingWorker(null)
  }

  // Filtered view
  const filteredMuster = useMemo(() => {
    return currentRecords.filter(rec => {
      const q = search.toLowerCase()
      const matchesSearch =
        rec.worker_name.toLowerCase().includes(q) ||
        rec.department.toLowerCase().includes(q) ||
        (rec.notes && rec.notes.toLowerCase().includes(q))

      const matchesDept = departmentFilter === 'all' || rec.department === departmentFilter

      return matchesSearch && matchesDept
    })
  }, [currentRecords, search, departmentFilter])

  // Aggregate Metrics for this Shift
  const metrics = useMemo(() => {
    const totalWorkers = currentRecords.length
    const present = currentRecords.filter(r => r.status === 'present').length
    const halfDay = currentRecords.filter(r => r.status === 'half_day').length
    const absent = currentRecords.filter(r => r.status === 'absent').length
    const totalOtHours = currentRecords.reduce((s, r) => s + (Number(r.ot_hours) || 0), 0)
    const totalWages = currentRecords.reduce((s, r) => s + (Number(r.total_earned) || 0), 0)
    const attendancePct = totalWorkers > 0 ? Math.round(((present + halfDay * 0.5) / totalWorkers) * 100) : 0

    return {
      totalWorkers,
      present,
      halfDay,
      absent,
      totalOtHours,
      totalWages,
      attendancePct
    }
  }, [currentRecords])

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Shift',
      'Worker Name',
      'Department',
      'Attendance Status',
      'Base Daily Wage',
      'OT Hours',
      'OT Amount',
      'Total Earned Today',
      'Notes'
    ]

    const rows = filteredMuster.map(r => [
      r.date,
      `"${r.shift}"`,
      `"${r.worker_name}"`,
      `"${r.department}"`,
      r.status.toUpperCase(),
      r.daily_wage,
      r.ot_hours,
      r.ot_amount,
      r.total_earned,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `labour_muster_${selectedDate}_${selectedShift.slice(0, 7)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Muster roll downloaded as CSV')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Labour Attendance & Muster"
        subtitle="Factory workforce attendance muster, machine shift logging, overtime tracking & daily wage calculations"
        icon={UserCheck}
        action={{
          label: 'Add Factory Worker',
          icon: Plus,
          onClick: handleOpenNewWorker,
        }}
      />

      {/* Date & Shift Control Bar */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                Muster Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                Operating Shift
              </label>
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value as any)}
                className="px-3 py-1.5 text-sm font-semibold border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="Morning Shift (6 AM - 2 PM)">Morning Shift (6 AM - 2 PM)</option>
                <option value="Evening Shift (2 PM - 10 PM)">Evening Shift (2 PM - 10 PM)</option>
                <option value="General Shift (8 AM - 5 PM)">General Shift (8 AM - 5 PM)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <button
              onClick={() => handleMarkAll('present')}
              className="px-3 py-1.5 bg-emerald-600/10 text-emerald-700 border border-emerald-300 text-xs font-semibold rounded-lg hover:bg-emerald-600/20 transition-colors"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="px-3 py-1.5 bg-red-500/10 text-red-700 border border-red-300 text-xs font-semibold rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Mark All Absent
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Muster
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold uppercase text-outline">Workforce Present</span>
          </div>
          <p className="text-2xl font-bold text-on-surface font-mono mt-2">
            {metrics.present} <span className="text-sm font-normal text-outline">/ {metrics.totalWorkers}</span>
          </p>
          <span className="text-xs text-outline">
            {metrics.attendancePct}% Attendance Rate
          </span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold uppercase text-outline">Overtime (OT) Logged</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 font-mono mt-2">
            {metrics.totalOtHours} <span className="text-sm font-normal text-outline">Hours</span>
          </p>
          <span className="text-xs text-outline">
            Extra plant production hours
          </span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600 shrink-0">
              <UserX className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold uppercase text-outline">Absentees Today</span>
          </div>
          <p className="text-2xl font-bold text-red-600 font-mono mt-2">
            {metrics.absent} <span className="text-sm font-normal text-outline">Workers</span>
          </p>
          <span className="text-xs text-outline">
            {metrics.halfDay > 0 ? `(${metrics.halfDay} Half Day)` : 'Full Absentees'}
          </span>
        </div>

        <div className="bg-surface rounded-2xl border border-outline-variant p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <IndianRupee className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold uppercase text-outline">Estimated Daily Wage Bill</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 font-mono mt-2">
            ₹{metrics.totalWages.toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-outline">
            Base Wages + OT Disbursement
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Search worker by name, dept..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleExportCSV}
            title="Download Muster CSV"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-outline-variant rounded-lg text-outline hover:text-on-surface hover:bg-surface-variant transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-hidden"
          >
            <option value="all">All Factory Departments</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Muster Table */}
      {filteredMuster.length === 0 ? (
        <EmptyState
          title="No Workers Found"
          description="Add factory workers to start recording daily attendance muster."
          icon={UserCheck}
          action={{
            label: 'Add Factory Worker',
            onClick: handleOpenNewWorker,
          }}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-variant/40 text-xs uppercase font-semibold text-outline border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3">Worker &amp; Dept</th>
                  <th className="px-4 py-3 text-right">Daily Rate</th>
                  <th className="px-4 py-3 text-center">Attendance Status</th>
                  <th className="px-4 py-3 text-center">Overtime (OT)</th>
                  <th className="px-4 py-3 text-right">Earned Today</th>
                  <th className="px-4 py-3">Task / Mix Log Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filteredMuster.map(rec => {
                  const workerObj = workers.find(w => w.id === rec.worker_id)

                  return (
                    <tr key={rec.id} className="hover:bg-surface-variant/20 transition-colors">
                      {/* Worker & Dept */}
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-on-surface">
                          {rec.worker_name}
                        </div>
                        <div className="text-xs text-outline">
                          {rec.department}
                        </div>
                        {workerObj?.skill_level && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-variant text-outline">
                            {workerObj.skill_level}
                          </span>
                        )}
                      </td>

                      {/* Daily Rate */}
                      <td className="px-4 py-3 align-top text-right font-mono text-outline">
                        ₹{rec.daily_wage}
                        <span className="block text-[10px] text-outline">
                          OT: ₹{workerObj?.hourly_ot_rate || 90}/h
                        </span>
                      </td>

                      {/* Attendance Status */}
                      <td className="px-4 py-3 align-top text-center">
                        <div className="inline-flex rounded-lg border border-outline-variant overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(rec.worker_id, { status: 'present' })}
                            className={`px-3 py-1 text-xs font-bold transition-colors ${
                              rec.status === 'present'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface text-outline hover:text-on-surface hover:bg-surface-variant'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(rec.worker_id, { status: 'half_day' })}
                            className={`px-3 py-1 text-xs font-bold transition-colors border-x border-outline-variant ${
                              rec.status === 'half_day'
                                ? 'bg-amber-500 text-white'
                                : 'bg-surface text-outline hover:text-on-surface hover:bg-surface-variant'
                            }`}
                          >
                            HD
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRecord(rec.worker_id, { status: 'absent' })}
                            className={`px-3 py-1 text-xs font-bold transition-colors ${
                              rec.status === 'absent'
                                ? 'bg-red-600 text-white'
                                : 'bg-surface text-outline hover:text-on-surface hover:bg-surface-variant'
                            }`}
                          >
                            A
                          </button>
                        </div>
                        <div className="text-[10px] text-outline mt-0.5 capitalize">
                          {rec.status.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Overtime (OT) */}
                      <td className="px-4 py-3 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="12"
                            step="0.5"
                            value={rec.ot_hours || ''}
                            placeholder="0"
                            onChange={e => handleUpdateRecord(rec.worker_id, { ot_hours: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 text-xs font-mono font-bold text-center border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs text-outline">hrs</span>
                        </div>
                        {rec.ot_hours > 0 && (
                          <span className="text-[10px] text-amber-700 font-mono mt-0.5 block">
                            +₹{rec.ot_amount}
                          </span>
                        )}
                      </td>

                      {/* Earned Today */}
                      <td className="px-4 py-3 align-top text-right font-mono">
                        <div className="font-bold text-on-surface text-sm">
                          ₹{rec.total_earned.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-outline">
                          {rec.status === 'present' ? 'Full Day' : rec.status === 'half_day' ? 'Half Day' : 'Unpaid'}
                        </div>
                      </td>

                      {/* Notes / Task */}
                      <td className="px-4 py-3 align-top">
                        <input
                          type="text"
                          placeholder="e.g. Operated Vibro Press #1 / Curing Yard"
                          value={rec.notes || ''}
                          onChange={e => handleUpdateRecord(rec.worker_id, { notes: e.target.value })}
                          className="w-full px-2.5 py-1 text-xs border border-outline-variant/60 rounded-md bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 align-top text-right">
                        {workerObj && (
                          <button
                            onClick={() => handleEditWorker(workerObj)}
                            title="Edit Worker Rate / Profile"
                            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Worker Drawer Modal */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-surface w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden border-l border-outline-variant animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  {editingWorker ? `Edit Worker: ${editingWorker.name}` : 'Register Factory Worker'}
                </h2>
                <p className="text-xs text-outline mt-0.5">
                  Add factory operators, pan mixers, curing boys, and loaders to the daily muster
                </p>
              </div>
              <button
                onClick={() => {
                  setIsWorkerModalOpen(false)
                  setEditingWorker(null)
                }}
                className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Worker Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Mondal / Subhasish Ghosh"
                  value={workerName}
                  onChange={e => setWorkerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Department / Machine Line *
                  </label>
                  <select
                    value={workerDept}
                    onChange={e => setWorkerDept(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Skill Level *
                  </label>
                  <select
                    value={workerSkill}
                    onChange={e => setWorkerSkill(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    <option value="Skilled">Skilled (Machine Operator / Welder)</option>
                    <option value="Semi-Skilled">Semi-Skilled (Mixer / Driver)</option>
                    <option value="Unskilled">Unskilled (Curing / Stacking)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-surface-variant/30 rounded-xl border border-outline-variant/60">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Daily Base Wage Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={workerWage}
                    onChange={e => setWorkerWage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[10px] text-outline mt-0.5 block">Full 8-hour shift rate</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Hourly Overtime Rate (₹/hr) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={workerOtRate}
                    onChange={e => setWorkerOtRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-outline-variant rounded-lg bg-surface text-amber-700 focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[10px] text-outline mt-0.5 block">Hourly compensation</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9832104561"
                    value={workerPhone}
                    onChange={e => setWorkerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Aadhaar Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4120"
                    value={workerAadhaar}
                    onChange={e => setWorkerAadhaar(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-variant/30">
              <button
                type="button"
                onClick={() => {
                  setIsWorkerModalOpen(false)
                  setEditingWorker(null)
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium text-outline hover:text-on-surface transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveWorker}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingWorker ? 'Update Worker' : 'Save to Muster'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Muster Print Modal */}
      {isPrintModalOpen && (
        <DailyMusterPrintModal
          date={selectedDate}
          shift={selectedShift}
          records={filteredMuster}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  )
}
