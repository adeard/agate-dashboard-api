IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WbGradingFinedDetail')
BEGIN
    CREATE TABLE WbGradingFinedDetail (
        id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number VARCHAR(50)  NOT NULL,
        kategori      VARCHAR(100) NOT NULL,
        total         INT          NOT NULL DEFAULT 0,
        denda         INT          NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_WbGradingFinedDetail_TicketNumber ON WbGradingFinedDetail (ticket_number);
END
