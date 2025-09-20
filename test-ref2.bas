TYPE Counter
  value AS NUMBER
END TYPE

SUB IncrementCounter(REF c AS Counter)
  c.value = c.value + 1
END SUB

LET counter = Counter { value: 10 }
PRINT "Before: counter.value = " + STR$(counter.value)
CALL IncrementCounter(counter)
PRINT "After: counter.value = " + STR$(counter.value)
END
