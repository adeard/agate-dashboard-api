IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WbGradingAcceptedClassification')
BEGIN
    CREATE TABLE WbGradingAcceptedClassification (
        id             INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number  VARCHAR(50)  NOT NULL,
        classification VARCHAR(100) NOT NULL
    );

    CREATE INDEX IX_WbGradingAcceptedClassification_TicketNumber ON WbGradingAcceptedClassification (ticket_number);
END
