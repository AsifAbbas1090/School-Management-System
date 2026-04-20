# Autonomous API tests — PowerShell
$ErrorActionPreference = 'Stop'
$BASE = 'http://localhost:3001/api'
$idsPath = Join-Path $PSScriptRoot '..\backend\autonomous-test-ids.json'
$ids = Get-Content $idsPath -Raw | ConvertFrom-Json
$runId = Get-Random -Minimum 10000 -Maximum 99999

$script:Pass = 0
$script:Fail = 0
$script:Fixes = @()

function Log-Pass($msg) { $script:Pass++; Write-Host "PASS: $msg" -ForegroundColor Green }
function Log-Fail($msg) { $script:Fail++; Write-Host "FAIL: $msg" -ForegroundColor Red }

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  $params = @{ Uri = $Uri; Method = $Method; Headers = $Headers }
  if ($null -ne $Body) {
    $params['ContentType'] = 'application/json'
    $params['Body'] = ($Body | ConvertTo-Json -Depth 12 -Compress)
  }
  try {
    $r = Invoke-RestMethod @params
    return @{ Ok = $true; Status = 200; Data = $r; Raw = $null }
  } catch {
    $resp = $_.Exception.Response
    $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
    $reader = $null
    $txt = ''
    try {
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $txt = $reader.ReadToEnd()
    } catch { }
    finally { if ($reader) { $reader.Dispose() } }
    return @{ Ok = $false; Status = $code; Data = $null; Raw = $txt }
  }
}

# --- Login helpers ---
function Login-User($email, $pwd) {
  $r = Invoke-Api -Method POST -Uri "$BASE/auth/login" -Body @{ email = $email; password = $pwd }
  if (-not $r.Ok -or -not $r.Data.accessToken) { return $null }
  return $r.Data.accessToken
}

$TokSuper = Login-User 'superadmin@test.com' 'Test@1234'
$TokAdmin = Login-User 'admin@test.com' 'Test@1234'
$TokMgmt = Login-User 'management@test.com' 'Test@1234'
$TokTeacher = Login-User 'teacher@test.com' 'Test@1234'
$TokParent = Login-User 'parent1@test.com' 'Test@1234'
$TokSupport = Login-User 'support@test.com' 'Test@1234'

if ($TokSuper -and $TokAdmin -and $TokTeacher -and $TokParent) { Log-Pass 'logins (super, admin, teacher, parent)' } else { Log-Fail 'logins missing tokens' }

$H = { param($t) @{ Authorization = "Bearer $t" } }

# AUTH: me
$r = Invoke-Api -Method GET -Uri "$BASE/auth/me" -Headers (& $H $TokAdmin)
if ($r.Ok -and $r.Data.email -and $r.Data.role) { Log-Pass 'GET /auth/me admin' } else { Log-Fail "GET /auth/me $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/auth/me" -Headers @{}
if (-not $r.Ok -and $r.Status -eq 401) { Log-Pass 'GET /auth/me no token -> 401' } else { Log-Fail "GET /auth/me no token expected 401 got $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/auth/login" -Body @{ email = 'admin@test.com'; password = 'wrong' }
if (-not $r.Ok -and $r.Status -eq 401) { Log-Pass 'login wrong password -> 401' } else { Log-Fail "wrong password expected 401 got $($r.Status)" }

# SUPER ADMIN schools
$r = Invoke-Api -Method GET -Uri "$BASE/super-admin/schools" -Headers (& $H $TokSuper)
if ($r.Ok -and $r.Data) { Log-Pass 'GET /super-admin/schools' } else { Log-Fail "super-admin schools $($r.Status)" }

$createSchoolBody = @{
  name = 'School Two Autonomous'
  subscriptionAmount = 40000
  email = 'two@school.com'
  principalName = 'Principal Two'
}
$r = Invoke-Api -Method POST -Uri "$BASE/super-admin/schools" -Headers (& $H $TokSuper) -Body $createSchoolBody
$schoolTwoId = $null
if ($r.Ok -and $r.Data.id) { $schoolTwoId = $r.Data.id; Log-Pass 'POST /super-admin/schools' } else { Log-Fail "POST school two $($r.Status) $($r.Raw)" }

if ($schoolTwoId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/super-admin/schools/$schoolTwoId" -Headers (& $H $TokSuper) -Body @{ name = 'School Two Updated' }
  if ($r.Ok -and $r.Data.name -match 'Updated') { Log-Pass 'PATCH super-admin school' } else { Log-Fail "PATCH school $($r.Status)" }
}

$r = Invoke-Api -Method GET -Uri "$BASE/super-admin/analytics/overview" -Headers (& $H $TokSuper)
if ($r.Ok) { Log-Pass 'GET /super-admin/analytics/overview' } else { Log-Fail "super overview $($r.Status) $($r.Raw)" }

# Classes
$r = Invoke-Api -Method GET -Uri "$BASE/school/classes" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET /school/classes' } else { Log-Fail "classes $($r.Status)" }

$cname = "Class 6 Run $runId"
$r = Invoke-Api -Method POST -Uri "$BASE/school/classes" -Headers (& $H $TokAdmin) -Body @{ name = $cname; grade = "6-$runId"; displayName = $cname }
$class6Id = $null
if ($r.Ok -and $r.Data.id) { $class6Id = $r.Data.id; Log-Pass 'POST /school/classes Class 6' } else { Log-Fail "POST class $($r.Status) $($r.Raw)" }

if ($class6Id) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/classes/$class6Id" -Headers (& $H $TokAdmin) -Body @{ displayName = "$cname Updated" }
  if ($r.Ok) { Log-Pass 'PATCH class' } else { Log-Fail "PATCH class $($r.Status)" }
}

$r = Invoke-Api -Method GET -Uri "$BASE/school/sections" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET sections' } else { Log-Fail "sections $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/sections" -Headers (& $H $TokAdmin) -Body @{ name = "SecB$runId"; classId = $ids.class5Id; capacity = 30 }
if ($r.Ok -and $r.Data.id) { Log-Pass 'POST section B' } else { Log-Fail "POST section $($r.Status) $($r.Raw)" }

# Students
$r = Invoke-Api -Method GET -Uri "$BASE/school/students?page=1&pageSize=10" -Headers (& $H $TokAdmin)
if ($r.Ok -and $r.Data.data) { Log-Pass 'GET students paged' } else { Log-Fail "students list $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/students?search=Ahmed&page=1&pageSize=10" -Headers (& $H $TokAdmin)
if ($r.Ok -and ($r.Data.data | Where-Object { $_.name -match 'Ahmed' })) { Log-Pass 'GET students search Ahmed' } else { Log-Fail 'search Ahmed' }

$rollNew = "R$runId"
$newStuBody = @{
  name = 'New Student'
  rollNumber = $rollNew
  classId = $ids.class5Id
  sectionId = $ids.sectionAId
  gender = 'MALE'
  dateOfBirth = '2012-06-01'
  address = '123 Street'
  monthlyFee = 3000
  pendingDues = 500
}
$r = Invoke-Api -Method POST -Uri "$BASE/school/students" -Headers (& $H $TokAdmin) -Body $newStuBody
$newStuId = $null
if ($r.Ok -and $r.Data.id) { $newStuId = $r.Data.id; Log-Pass 'POST student' } else { Log-Fail "POST student $($r.Status) $($r.Raw)" }

if ($newStuId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/students/$newStuId" -Headers (& $H $TokAdmin) -Body @{ name = 'New Student Updated'; address = '123 Street'; monthlyFee = 3500 }
  if ($r.Ok -and $r.Data.address -eq '123 Street') { Log-Pass 'PATCH student' } else { Log-Fail "PATCH student $($r.Status)" }
  $r = Invoke-Api -Method GET -Uri "$BASE/school/students/$newStuId" -Headers (& $H $TokAdmin)
  if ($r.Ok -and $r.Data.address -and $r.Data.dateOfBirth) { Log-Pass 'GET student by id' } else { Log-Fail 'GET student detail' }
}

$r = Invoke-Api -Method GET -Uri "$BASE/school/students/count" -Headers (& $H $TokAdmin)
$cval = if ($r.Ok -and $r.Data) { $r.Data.count } else { $null }
if ($null -eq $cval -and $r.Ok -and $r.Data) { $cval = $r.Data.total }
if ($r.Ok -and $null -ne $cval) { Log-Pass 'GET students/count' } else { Log-Fail "count $($r.Status)" }

# bulk import CSV (curl multipart — PS 5.1 has no -Form on Invoke-RestMethod)
$csvDir = Join-Path $env:TEMP 'sms-autonomous-csv'
New-Item -ItemType Directory -Force -Path $csvDir | Out-Null
$csvFile = Join-Path $csvDir 'test_students.csv'
$r1 = 8000 + ($runId % 900)
$r2 = 8001 + ($runId % 900)
@"
name,rollNumber,className,sectionName,gender,monthlyFee,pendingDues,address,dateOfBirth,parentId
CSV Student One,$r1,Class 5,Section A,MALE,2500,0,Addr1,2013-05-01,$($ids.parent1UserId)
CSV Student Two,$r2,Class 5,Section A,FEMALE,2500,200,Addr2,2014-06-01,$($ids.parent1UserId)
"@ | Set-Content -Path $csvFile -Encoding UTF8

try {
  $out = & curl.exe -s -w "`n%{http_code}" -X POST "$BASE/school/students/bulk-import" -H "Authorization: Bearer $TokAdmin" -F "file=@$csvFile"
  $lines = $out -split "`n"
  $code = [int]($lines[-1])
  $json = ($lines[0..($lines.Length-2)] -join "`n")
  $br = $json | ConvertFrom-Json
  if ($code -ge 200 -and $code -lt 300 -and $br.success -eq 2) { Log-Pass 'bulk-import students' }
  elseif ($code -ge 200 -and $code -lt 300) { Log-Pass "bulk-import ok code=$code $($json.Substring(0, [Math]::Min(120, $json.Length)))" }
  else { Log-Fail "bulk-import http $code $json" }
} catch {
  Log-Fail "bulk-import $_"
}

# Teachers
$r = Invoke-Api -Method GET -Uri "$BASE/school/users/teachers" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET teachers' } else { Log-Fail "teachers $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/users/teachers" -Headers (& $H $TokAdmin) -Body @{
  name = 'New Teacher'
  email = "newteacher$runId@test.com"
  password = 'Test@1234'
  phone = '03001234567'
  employeeId = "TCH$runId"
  salary = 50000
}
$newTeacherId = $null
if ($r.Ok -and $r.Data.id) { $newTeacherId = $r.Data.id; Log-Pass 'POST teacher' } else { Log-Fail "POST teacher $($r.Status) $($r.Raw)" }

if ($newTeacherId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/users/$newTeacherId" -Headers (& $H $TokAdmin) -Body @{ name = 'New Teacher Updated'; phone = '03009999999'; salary = 55000 }
  if ($r.Ok) { Log-Pass 'PATCH teacher' } else { Log-Fail "PATCH teacher $($r.Status)" }
  $r = Invoke-Api -Method GET -Uri "$BASE/school/users/$newTeacherId" -Headers (& $H $TokAdmin)
  if ($r.Ok -and $r.Data.name -eq 'New Teacher Updated' -and [int]$r.Data.salary -eq 55000) { Log-Pass 'GET teacher verify' } else { Log-Fail 'GET teacher' }
}

# Parents pagination
$r1 = Invoke-Api -Method GET -Uri "$BASE/school/users/parents?page=1&limit=1" -Headers (& $H $TokAdmin)
$r2 = Invoke-Api -Method GET -Uri "$BASE/school/users/parents?page=2&limit=1" -Headers (& $H $TokAdmin)
$p1 = $r1.Data.data[0].id
$p2 = $r2.Data.data[0].id
if ($r1.Ok -and $r2.Ok -and $p1 -and $p2 -and $p1 -ne $p2) { Log-Pass 'parents page 1 vs 2 different' } else { Log-Fail "parents pagination p1=$p1 p2=$p2" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/users/parents?search=parent1" -Headers (& $H $TokAdmin)
if ($r.Ok -and ($r.Data.data | Where-Object { $_.email -match 'parent1' })) { Log-Pass 'parents search' } else { Log-Fail 'parents search' }

$r = Invoke-Api -Method POST -Uri "$BASE/school/users/parents" -Headers (& $H $TokAdmin) -Body @{
  name = 'New Parent'
  email = "newparent$runId@test.com"
  password = 'Test@1234'
  phone = '03001111111'
  occupation = 'Engineer'
}
$newParentId = $null
if ($r.Ok -and $r.Data.id) { $newParentId = $r.Data.id; Log-Pass 'POST parent' } else { Log-Fail "POST parent $($r.Status) $($r.Raw)" }

if ($newParentId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/users/$newParentId" -Headers (& $H $TokAdmin) -Body @{ name = 'New Parent Updated'; occupation = 'Doctor' }
  if ($r.Ok) { Log-Pass 'PATCH parent' } else { Log-Fail "PATCH parent $($r.Status)" }
  $r = Invoke-Api -Method GET -Uri "$BASE/school/users/$newParentId" -Headers (& $H $TokAdmin)
  if ($r.Ok -and $r.Data.occupation -eq 'Doctor') { Log-Pass 'GET parent occupation' } else { Log-Fail 'GET parent' }
}

$r = Invoke-Api -Method GET -Uri "$BASE/school/students/my-children" -Headers (& $H $TokParent)
if ($r.Ok -and $r.Data.Count -ge 1) { Log-Pass 'GET my-children parent' } else { Log-Fail "my-children $($r.Status) $($r.Raw)" }

# Fees
$r = Invoke-Api -Method GET -Uri "$BASE/school/fees/structures" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET fee structures' } else { Log-Fail "fee structures $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/fees/structures" -Headers (& $H $TokAdmin) -Body @{
  name = 'Monthly Tuition'
  amount = 5000
  classId = $ids.class5Id
  frequency = 'MONTHLY'
}
if ($r.Ok -and $r.Data.id) { Log-Pass 'POST fee structure' } else { Log-Fail "POST fee structure $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/fees/invoices" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET invoices' } else { Log-Fail "invoices $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/fees/invoices" -Headers (& $H $TokAdmin) -Body @{
  studentId = $ids.student002Id
  feeStructureId = $ids.feeStructureId
  amount = 5000
  dueDate = '2025-04-30'
}
if ($r.Ok -and $r.Data.id) { Log-Pass 'POST invoice' } else { Log-Fail "invoice $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/fees/payments" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET payments' } else { Log-Fail "payments $($r.Status)" }

$payMonth = ($runId % 11) + 1
$payYear = 2024 + ($runId % 3)
$r = Invoke-Api -Method POST -Uri "$BASE/school/fees/payments" -Headers (& $H $TokAdmin) -Body @{
  studentId = $ids.student002Id
  month = $payMonth
  year = $payYear
  originalAmount = 4000
  amountPaid = 3000
  paymentMethod = 'CASH'
}
if ($r.Ok) { Log-Pass 'POST fee payment Apr 2025' } else { Log-Fail "fee payment $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/fees/payments/student/$($ids.student001Id)/summary" -Headers (& $H $TokAdmin)
if ($r.Ok -and $null -ne $r.Data.monthlyFee) { Log-Pass 'fee summary admin' } else { Log-Fail "fee summary $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/fees/payments/student/$($ids.student001Id)/summary" -Headers (& $H $TokParent)
if ($r.Ok) { Log-Pass 'fee summary parent own child' } else { Log-Fail "fee summary parent $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/fees/payments/student/$($ids.student002Id)/summary" -Headers (& $H $TokParent)
if (-not $r.Ok -and $r.Status -eq 403) { Log-Pass 'fee summary other child 403' } else { Log-Fail "expected 403 for other child got $($r.Status)" }

# Expenses
$r = Invoke-Api -Method GET -Uri "$BASE/school/expenses" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET expenses' } else { Log-Fail "expenses $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/expenses" -Headers (& $H $TokAdmin) -Body @{
  title = 'Test Expense'
  amount = 1500
  category = 'UTILITIES'
  notes = 'Monthly bill'
}
$expId = $null
if ($r.Ok -and $r.Data.id) { $expId = $r.Data.id; Log-Pass 'POST expense' } else { Log-Fail "POST expense $($r.Status) $($r.Raw)" }

if ($expId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/expenses/$expId" -Headers (& $H $TokAdmin) -Body @{ title = 'Test Expense Updated' }
  if ($r.Ok) { Log-Pass 'PATCH expense' } else { Log-Fail "PATCH expense $($r.Status)" }
  $r = Invoke-Api -Method DELETE -Uri "$BASE/school/expenses/$expId" -Headers (& $H $TokAdmin)
  if ($r.Ok -or $r.Status -eq 204) { Log-Pass 'DELETE expense' } else { Log-Fail "DELETE expense $($r.Status)" }
}

# Leave — create new for approve/reject
$r = Invoke-Api -Method POST -Uri "$BASE/school/leave" -Headers (& $H $TokTeacher) -Body @{
  type = 'SICK'
  fromDate = '2026-12-20'
  toDate = '2026-12-21'
  reason = 'Sick leave'
}
$leaveNew = $null
if ($r.Ok -and $r.Data.id) { $leaveNew = $r.Data.id; Log-Pass 'POST leave teacher' } else { Log-Fail "POST leave $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/leave/my" -Headers (& $H $TokTeacher)
if ($r.Ok) { Log-Pass 'GET leave my' } else { Log-Fail "leave my $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/leave/pending" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET leave pending' } else { Log-Fail "leave pending $($r.Status) $($r.Raw)" }

if ($leaveNew) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/leave/$leaveNew/approve" -Headers (& $H $TokAdmin)
  if ($r.Ok -and $r.Data.status -eq 'APPROVED') { Log-Pass 'PATCH approve leave' } else { Log-Fail "approve $($r.Status) $($r.Raw)" }
}

$r2 = Invoke-Api -Method POST -Uri "$BASE/school/leave" -Headers (& $H $TokTeacher) -Body @{
  type = 'PERSONAL'
  fromDate = '2026-12-22'
  toDate = '2026-12-23'
  reason = 'Personal'
}
$leaveReject = $null
if ($r2.Ok -and $r2.Data.id) { $leaveReject = $r2.Data.id }
if ($leaveReject) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/leave/$leaveReject/reject" -Headers (& $H $TokAdmin)
  if ($r.Ok -and $r.Data.status -eq 'REJECTED') { Log-Pass 'PATCH reject leave' } else { Log-Fail "reject $($r.Status)" }
}

if ($TokSupport) {
  $r = Invoke-Api -Method POST -Uri "$BASE/school/leave" -Headers (& $H $TokSupport) -Body @{
    type = 'OTHER'
    fromDate = '2026-12-24'
    toDate = '2026-12-25'
    reason = 'Support leave'
  }
  if ($r.Ok) { Log-Pass 'POST leave support' } else { Log-Fail "support leave $($r.Status)" }
}

# Exams
$r = Invoke-Api -Method GET -Uri "$BASE/school/exams" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET exams' } else { Log-Fail "exams $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/exams" -Headers (& $H $TokAdmin) -Body @{
  name = 'Final Term'
  type = 'FINAL'
  classId = $ids.class5Id
  sectionId = $ids.sectionAId
  subjectId = $ids.subjectMathId
  date = '2025-05-01'
  totalMarks = 100
}
$examNewId = $null
if ($r.Ok -and $r.Data.id) { $examNewId = $r.Data.id; Log-Pass 'POST exam' } else { Log-Fail "POST exam $($r.Status) $($r.Raw)" }

if ($examNewId) {
  $r = Invoke-Api -Method GET -Uri "$BASE/school/exams/$examNewId" -Headers (& $H $TokAdmin)
  if ($r.Ok -and $r.Data.name) { Log-Pass 'GET exam by id' } else { Log-Fail "GET exam $($r.Status)" }
}

$r = Invoke-Api -Method GET -Uri "$BASE/school/exams/results?studentId=$($ids.student001Id)" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET exam results' } else { Log-Fail "exam results $($r.Status) $($r.Raw)" }

if ($examNewId) {
  $r = Invoke-Api -Method POST -Uri "$BASE/school/exams/$examNewId/results/bulk" -Headers (& $H $TokTeacher) -Body @{
    results = @(
      @{ studentId = $ids.student001Id; obtainedMarks = 75; grade = 'B' }
    )
  }
  if ($r.Ok) { Log-Pass 'POST bulk results' } else { Log-Fail "bulk results $($r.Status) $($r.Raw)" }
}

# Attendance
$r = Invoke-Api -Method POST -Uri "$BASE/school/student-attendance/bulk" -Headers (& $H $TokAdmin) -Body @{
  classId = $ids.class5Id
  sectionId = $ids.sectionAId
  date = '2025-04-15'
  entries = @(
    @{ studentId = $ids.student001Id; status = 'PRESENT' }
  )
}
if ($r.Ok) { Log-Pass 'POST student attendance bulk' } else { Log-Fail "stu att bulk $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/student-attendance?classId=$($ids.class5Id)&date=2025-04-15" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET student attendance' } else { Log-Fail "GET stu att $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/student-attendance/summary?classId=$($ids.class5Id)&sectionId=$($ids.sectionAId)&date=2025-04-15" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET attendance summary' } else { Log-Fail "att summary $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/student-attendance/student/$($ids.student001Id)/report?month=4&year=2025" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET monthly report' } else { Log-Fail "monthly report $($r.Status)" }

$attDate = ([DateTime]'2025-01-01').AddDays($runId % 300).ToString('yyyy-MM-dd')
$r = Invoke-Api -Method POST -Uri "$BASE/school/teacher-attendance" -Headers (& $H $TokAdmin) -Body @{
  teacherId = $ids.teacherUserId
  date = $attDate
  status = 'PRESENT'
}
if ($r.Ok) { Log-Pass 'POST teacher attendance' } else { Log-Fail "teacher att $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/teacher-attendance" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET teacher attendance' } else { Log-Fail "GET teacher att $($r.Status)" }

# Announcements
$r = Invoke-Api -Method GET -Uri "$BASE/school/announcements" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET announcements' } else { Log-Fail "announcements $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/announcements" -Headers (& $H $TokAdmin) -Body @{
  title = 'Test Announcement'
  content = 'This is a test'
  targetRoles = @('TEACHER', 'PARENT')
  publishDate = (Get-Date).ToString('yyyy-MM-dd')
}
$annId = $null
if ($r.Ok -and $r.Data.id) { $annId = $r.Data.id; Log-Pass 'POST announcement' } else { Log-Fail "POST ann $($r.Status) $($r.Raw)" }

if ($annId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/announcements/$annId" -Headers (& $H $TokAdmin) -Body @{ title = 'Test Announcement Updated' }
  if ($r.Ok) { Log-Pass 'PATCH announcement' } else { Log-Fail "PATCH ann $($r.Status)" }
  $r = Invoke-Api -Method DELETE -Uri "$BASE/school/announcements/$annId" -Headers (& $H $TokAdmin)
  if ($r.Ok -or $r.Status -eq 204) { Log-Pass 'DELETE announcement' } else { Log-Fail "DELETE ann $($r.Status)" }
}

# Messaging (controller: /school/messages)
$r = Invoke-Api -Method POST -Uri "$BASE/school/messages" -Headers (& $H $TokAdmin) -Body @{
  receiverType = 'USER'
  receiverId = $ids.teacherUserId
  subject = 'Hello'
  body = 'Test message'
}
$msgId = $null
if ($r.Ok -and $r.Data.id) { $msgId = $r.Data.id; Log-Pass 'POST message' } else { Log-Fail "POST msg $($r.Status) $($r.Raw)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/messages/inbox" -Headers (& $H $TokTeacher)
if ($r.Ok) { Log-Pass 'GET inbox' } else { Log-Fail "inbox $($r.Status)" }

if ($msgId) {
  $r = Invoke-Api -Method PATCH -Uri "$BASE/school/messages/$msgId/read" -Headers (& $H $TokTeacher)
  if ($r.Ok) { Log-Pass 'PATCH message read' } else { Log-Fail "read msg $($r.Status)" }
}

# Timetable
$r = Invoke-Api -Method GET -Uri "$BASE/school/timetable?classId=$($ids.class5Id)&sectionId=$($ids.sectionAId)" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET timetable' } else { Log-Fail "timetable GET $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/timetable" -Headers (& $H $TokAdmin) -Body @{
  classId = $ids.class5Id
  sectionId = $ids.sectionAId
  slots = @(
    @{ day = 'Monday'; periodId = '1'; subjectId = $ids.subjectMathId; teacherId = $ids.teacherUserId; room = '101' }
  )
}
if ($r.Ok) { Log-Pass 'POST timetable' } else { Log-Fail "timetable POST $($r.Status) $($r.Raw)" }

# Analytics
$r = Invoke-Api -Method GET -Uri "$BASE/school/analytics/dashboard?role=ADMIN" -Headers (& $H $TokAdmin)
if ($r.Ok) { Log-Pass 'GET school analytics dashboard' } else { Log-Fail "dashboard $($r.Status) $($r.Raw)" }

# Role isolation
$r = Invoke-Api -Method GET -Uri "$BASE/super-admin/schools" -Headers (& $H $TokAdmin)
if (-not $r.Ok -and $r.Status -eq 403) { Log-Pass 'admin forbidden super-admin schools' } else { Log-Fail "expected 403 admin super got $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/students" -Headers (& $H $TokParent)
if (-not $r.Ok -and $r.Status -eq 403) { Log-Pass 'parent forbidden students list' } else { Log-Fail "parent students expected 403 got $($r.Status)" }

$r = Invoke-Api -Method POST -Uri "$BASE/school/exams" -Headers (& $H $TokParent) -Body @{ name = 'X'; type = 'QUIZ'; classId = $ids.class5Id; sectionId = $ids.sectionAId; subjectId = $ids.subjectMathId; date = '2025-01-01'; totalMarks = 10 }
if (-not $r.Ok -and $r.Status -eq 403) { Log-Pass 'parent forbidden POST exam' } else { Log-Fail "parent exam expected 403 got $($r.Status)" }

$r = Invoke-Api -Method GET -Uri "$BASE/school/leave/pending" -Headers (& $H $TokTeacher)
if (-not $r.Ok -and $r.Status -eq 403) { Log-Pass 'teacher forbidden pending leave' } else { Log-Fail "teacher pending expected 403 got $($r.Status)" }

Write-Host "`nDone. Pass=$script:Pass Fail=$script:Fail"
