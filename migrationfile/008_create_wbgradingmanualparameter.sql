IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WbGradingManualParameter')
BEGIN
    CREATE TABLE WbGradingManualParameter (
        id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number VARCHAR(50)  NOT NULL,
        parameter     VARCHAR(100) NOT NULL,
        qty           INT          NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_WbGradingManualParameter_TicketNumber ON WbGradingManualParameter (ticket_number);
END
