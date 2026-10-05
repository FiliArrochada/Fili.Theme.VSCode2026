SELECT o.Id, COUNT(*) AS Lines, GETDATE() AS Now
FROM dbo.Orders AS o
JOIN sys.objects AS s ON s.object_id = o.Id
WHERE o.Status = 'Open';

EXEC sp_who;
