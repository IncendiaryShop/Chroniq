# Chroniq

A shift & comp-off tracker built with React, Vite and Supabase.

This is a React/Vite rewrite of the original single-file `index.html`
prototype (formerly ShiftLedger, now rebranded to Chroniq). All behavior
— authentication, the calendar, the date-range apply feature, the
comp-off ledger and redemption dates, and default shift timings — has
been preserved and split into a proper component structure. Nothing
about your existing Supabase data changes: the app still reads and
writes the same tables with the same columns.
