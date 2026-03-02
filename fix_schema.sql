ALTER TABLE "AIProviderConfig" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AIProviderConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Add foreign key if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'AIProviderConfig_userId_fkey'
    ) THEN
        ALTER TABLE "AIProviderConfig" ADD CONSTRAINT "AIProviderConfig_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'AIProviderConfig_userId_name_key'
    ) THEN
        CREATE UNIQUE INDEX "AIProviderConfig_userId_name_key" ON "AIProviderConfig"("userId", "name");
    END IF;
END $$;

-- Add index
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'AIProviderConfig_userId_idx'
    ) THEN
        CREATE INDEX "AIProviderConfig_userId_idx" ON "AIProviderConfig"("userId");
    END IF;
END $$;
