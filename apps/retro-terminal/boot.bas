REM ========================================
REM BASIC9000 Boot Sequence
REM Enhanced with Type System Features
REM ========================================

' Boot sequence - enhanced with new type system

' Define system info type
TYPE SystemInfo
  platform AS STRING
  version AS STRING
  httpReady AS BOOL
  timeStamp AS STRING
END TYPE

' Create system status with literal syntax
LET sys = SystemInfo {
  platform: SYS.PLATFORM(),
  version: "9000",
  httpReady: HTTP.STATUS("https://example.com") = 200,
  timeStamp: TIME.FORMAT(TIME.NOW(), "YYYY-MM-DD HH:mm:ss")
}

' Display system information
PRINT "╔════════════════════════════════════╗"
PRINT "║       BASIC9000 SYSTEM STATUS      ║"
PRINT "╚════════════════════════════════════╝"
PRINT
PRINT "Platform: " + sys.platform
PRINT "Version:  " + sys.version
PRINT "HTTP:     " + (sys.httpReady ? "ONLINE" : "OFFLINE")
PRINT "Time:     " + sys.timeStamp
PRINT

' Define a property for system readiness
PROPERTY SystemInfo.IsReady(self AS SystemInfo) AS BOOL GET
  RETURN self.httpReady
END PROPERTY

' Check if system is ready using ternary
PRINT sys.IsReady ? "✓ All systems operational" : "⚠ Some systems offline"

PRINT
PRINT "Type 'RUN demos/type-system-demo' to explore"
PRINT "the new type system features!"
PRINT

' Show a quick feature demo
TYPE Feature
  name AS STRING
  available AS BOOL
  version AS STRING
END TYPE

LET f1 = Feature { name: "Ternary Operator", available: TRUE, version: "1.0" }
LET f2 = Feature { name: "Type System", available: TRUE, version: "1.0" }
LET f3 = Feature { name: "Properties", available: TRUE, version: "1.0" }
LET features = [f1, f2, f3]

PRINT "New Features:"
FOR i = 0 TO ARRAY.LENGTH(features) - 1
  LET f = ARRAY.GET(features, i)
  LET status$ = f.available ? "✓" : "✗"
  PRINT "  " + status$ + " " + f.name + " v" + f.version
NEXT i
PRINT

TERMINAL.STATUS("READY")