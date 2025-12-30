-- Add encryption_salt column to accounts table
-- This stores the Argon2 salt used for deriving the trace encryption key
-- Salt is 16 bytes, stored as bytea, nullable (not all accounts use trace encryption)
ALTER TABLE "accounts" ADD COLUMN "encryption_salt" bytea;
