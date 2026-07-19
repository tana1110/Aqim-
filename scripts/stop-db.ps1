# Stops the Aqim PostgreSQL server.
$bin  = 'C:\Users\Admin\aqim-pg\pgsql\bin'
$data = 'C:\Users\Admin\aqim-pgdata'
& "$bin\pg_ctl.exe" -D $data -m fast stop
