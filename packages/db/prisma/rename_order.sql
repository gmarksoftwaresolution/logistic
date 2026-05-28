-- Step 1: Rename the "Order" table to "Order_old"
ALTER TABLE IF EXISTS "Order" RENAME TO "Order_old";

-- Step 2: Rename the primary key index
ALTER INDEX IF EXISTS "Order_pkey" RENAME TO "Order_old_pkey";
