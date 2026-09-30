IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WbGradingRejectedDetail')
BEGIN
    CREATE TABLE WbGradingRejectedDetail (
        id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number VARCHAR(50)  NOT NULL,
        kategori      VARCHAR(50)  NOT NULL,
        sub_kategori  VARCHAR(100) NOT NULL,
        qty           INT          NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_WbGradingRejectedDetail_TicketNumber ON WbGradingRejectedDetail (ticket_number);
END
