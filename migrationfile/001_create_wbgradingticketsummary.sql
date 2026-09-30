IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WbGradingTicketSummary')
BEGIN
    CREATE TABLE WbGradingTicketSummary (
        id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number   VARCHAR(50)     NOT NULL,
        delivery_number VARCHAR(50)     NOT NULL,
        vehicle_number  VARCHAR(20)     NOT NULL,
        [date]          DATETIME2(7)    NOT NULL,
        unripe          INT             NOT NULL DEFAULT 0,
        ripe            INT             NOT NULL DEFAULT 0,
        over_ripe       INT             NOT NULL DEFAULT 0,
        empty_bunch     INT             NOT NULL DEFAULT 0,
        abnormal        INT             NOT NULL DEFAULT 0,
        rotten          INT             NOT NULL DEFAULT 0,
        long_stalk      INT             NOT NULL DEFAULT 0,
        rat_damage      INT             NOT NULL DEFAULT 0,
        loss_fruit      INT             NOT NULL DEFAULT 0,
        created_at      DATETIME2(7)    NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_WbGradingTicketSummary_TicketNumber ON WbGradingTicketSummary (ticket_number);
END
