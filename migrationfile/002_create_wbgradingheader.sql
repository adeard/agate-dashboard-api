IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WbGradingHeader')
BEGIN
    CREATE TABLE WbGradingHeader (
        id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number   VARCHAR(50)     NOT NULL,
        delivery_number VARCHAR(50)     NOT NULL,
        vehicle_number  VARCHAR(20)     NOT NULL,
        vendor_name     VARCHAR(100)    NOT NULL,
        vendor_id       VARCHAR(50)     NOT NULL,
        vendor_type     INT             NOT NULL,
        [date]          DATETIME2(7)    NOT NULL,
        finish_date     DATETIME2(7)    NOT NULL,
        total_tandan    INT             NOT NULL DEFAULT 0,
        total_accepted  INT             NOT NULL DEFAULT 0,
        total_rejected  INT             NOT NULL DEFAULT 0,
        total_fined     INT             NOT NULL DEFAULT 0,
        total_multiple  INT             NOT NULL DEFAULT 0,
        created_at      DATETIME2(7)    NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_WbGradingHeader_TicketNumber ON WbGradingHeader (ticket_number);
END
