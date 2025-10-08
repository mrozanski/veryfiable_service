# Veryfiable Attestation Service

> Verified public reviews using Ethereum Attestation Service (EAS)

**Version**: 0.1.0 (MVP)  
**Key Pitch**: "Four fields eliminate fake reviews"

## Overview

The Veryfiable Attestation Service is a REST API that enables creating and retrieving off-chain EAS attestations for verified reviews. This service proves that reviews come from real transactions, solving the fake review crisis affecting Google, Yelp, Amazon, and any platform with user-generated reviews.

## Features

- ✅ Create verified reviews as EAS attestations
- ✅ Store attestations with platform and item identification
- ✅ Query reviews by platform, item, or attester
- ✅ Full-text search on review content
- ✅ Database-backed persistence with PostgreSQL

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Blockchain**: Ethereum (via Ethers.js)
- **Attestation**: EAS SDK (@ethereum-attestation-service/eas-sdk)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mrozanski/veryfiable_service.git
cd veryfiable_service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=veryfiable
DB_USER=postgres
DB_PASSWORD=your_password_here

# CORS Configuration
CORS_ORIGIN=*

# Ethereum / EAS Configuration
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here
EAS_CONTRACT_ADDRESS=0x4200000000000000000000000000000000000021
SCHEMA_REGISTRY_ADDRESS=0x4200000000000000000000000000000000000020

# EAS Schema UID (to be filled after registration)
PUBLIC_REVIEW_SCHEMA_UID=0x...
```

### 4. Database Setup

#### Create Database and user

```bash
psql -d postgres -c "CREATE DATABASE veryfiable;"
psql postgres -c "CREATE USER veryfiable WITH PASSWORD 'your_password';"
# Make user the database owner (this is the key step)
psql postgres -c "ALTER DATABASE veryfiable OWNER TO veryfiable;"

```

#### Run Schema Migration

```bash
psql -U postgres -d veryfiable -f database/schema.sql
```

Or using the environment variables:

```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql
```

## EAS Schema Registration

Before you can create attestations, you need to register the Public Review schema on the Ethereum Attestation Service.

### Prerequisites for Schema Registration

1. **Base Sepolia Testnet ETH**: You need a small amount of testnet ETH to pay for gas fees
   - Get free testnet ETH from the [Coinbase Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Typically 0.01 ETH is sufficient for schema registration

2. **Wallet Private Key**: Export your wallet's private key (keep it secure!)
   - **NEVER commit your private key to version control**
   - **NEVER share your private key**
   - Use a dedicated wallet for testing purposes

### Environment Setup for Registration

Ensure your `.env` file has the following variables configured:

```env
# Required for schema registration
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here
SCHEMA_REGISTRY_ADDRESS=0x4200000000000000000000000000000000000020
```

### Registering the Schema

Run the registration script:

```bash
npm run register-schema
```

The script will:
1. ✅ Validate all environment variables
2. ✅ Connect to Base Sepolia network
3. ✅ Check your wallet balance
4. ✅ Register the schema: `string platformId,string itemId,string reviewText,uint8 rating`
5. ✅ Output the schema UID

### Expected Output

```
═══════════════════════════════════════════════════════════
  EAS Schema Registration Script
  Base Sepolia Testnet
═══════════════════════════════════════════════════════════

ℹ️  Validating environment variables...
✅ Environment variables validated successfully

ℹ️  Connecting to Base Sepolia network...
✅ Connected to network: base-sepolia (Chain ID: 84532)
ℹ️  Wallet address: 0x...
ℹ️  Wallet balance: 0.05 ETH

ℹ️  Initializing Schema Registry...
ℹ️  Schema Details:
  Schema: string platformId,string itemId,string reviewText,uint8 rating
  Resolver: 0x0000000000000000000000000000000000000000
  Revocable: true

ℹ️  Registering schema on Base Sepolia...
⚠️  This will require a transaction and gas fees.
ℹ️  Transaction submitted: 0x...
ℹ️  Waiting for transaction confirmation...
✅ Schema registered successfully!

═══════════════════════════════════════════════════════════
Schema UID: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
═══════════════════════════════════════════════════════════

ℹ️  Next Steps:
  1. Copy the Schema UID above
  2. Add it to your .env file as PUBLIC_REVIEW_SCHEMA_UID
  3. Use this UID when creating attestations
```

### After Registration

1. **Copy the Schema UID** from the output (the long hexadecimal string starting with `0x`)

2. **Update your `.env` file** with the schema UID:
   ```env
   PUBLIC_REVIEW_SCHEMA_UID=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

3. **Verify the schema** on EAS Scan:
   - Visit: https://base-sepolia.easscan.org/schema/view/YOUR_SCHEMA_UID
   - Replace `YOUR_SCHEMA_UID` with your actual schema UID

4. **Save the Schema UID** - you'll need it for creating attestations

### Troubleshooting Schema Registration

#### Error: Missing environment variables

```
❌ ERROR: Missing required environment variables: RPC_URL, PRIVATE_KEY
```

**Solution**: Ensure your `.env` file exists and contains all required variables. Copy from `.env.example` if needed.

#### Error: Invalid PRIVATE_KEY format

```
❌ ERROR: Invalid PRIVATE_KEY format. Must be a 64-character hexadecimal string
```

**Solution**: Check that your private key is exactly 64 hexadecimal characters (with or without `0x` prefix).

#### Error: Network connection failed

```
❌ ERROR: Network connection failed: could not detect network
```

**Solution**:
- Check your internet connection
- Verify the RPC_URL is correct
- Try an alternative RPC endpoint (see `.env.example` for options)

#### Warning: Wallet has zero balance

```
⚠️  Wallet has zero balance. You will need testnet ETH to register the schema.
```

**Solution**: Get testnet ETH from the [Coinbase Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

#### Error: Insufficient funds

```
❌ ERROR: Insufficient funds to pay for gas.
```

**Solution**: Your wallet needs more testnet ETH. Visit the faucet and request more funds.

#### Error: Schema already exists

```
❌ ERROR: Schema already exists. This schema may have been registered previously.
```

**Solution**: The schema has already been registered with this wallet. Check your previous transactions or use the existing schema UID.

### Schema Details

The Public Review schema contains four fields:

| Field | Type | Description |
|-------|------|-------------|
| `platformId` | string | Platform identifier (e.g., "yelp", "amazon", "google") |
| `itemId` | string | Platform-specific item identifier |
| `reviewText` | string | The review content/text |
| `rating` | uint8 | Numeric rating (typically 1-10) |

**Schema Properties**:
- **Revocable**: Yes - reviews can be revoked if needed
- **Resolver**: None (0x0000000000000000000000000000000000000000)
- **Network**: Base Sepolia Testnet

## Running the Service

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## API Endpoints

### Health Check

```bash
GET /api/v1/health
```

**Response:**

```json
{
  "status": "healthy",
  "database": "connected",
  "version": "0.1.0",
  "timestamp": "2025-10-07T19:30:00Z"
}
```

### Root

```bash
GET /
```

**Response:**

```json
{
  "service": "Veryfiable Attestation Service",
  "version": "0.1.0",
  "description": "Verified public reviews using EAS",
  "endpoints": {
    "health": "/api/v1/health"
  }
}
```

## Testing

### Quick Test

```bash
# Install dependencies
npm install

# Start server
npm run dev

# In another terminal, test health endpoint
curl http://localhost:3001/api/v1/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "database": "connected",
  "version": "0.1.0",
  "timestamp": "2025-10-07T19:30:00Z"
}
```

## Project Structure

```
veryfiable-service/
├── src/
│   ├── index.js              # Main Express application
│   ├── config/
│   │   └── database.js       # PostgreSQL connection pool
│   ├── routes/               # API routes (future)
│   ├── controllers/          # Business logic (future)
│   ├── models/               # Data models (future)
│   └── utils/                # Utility functions (future)
├── database/
│   └── schema.sql            # Database schema
├── scripts/                  # Utility scripts (future)
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Database Schema

### Attestations Table

Stores EAS attestations for verified reviews.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `uid` | VARCHAR(66) | EAS attestation UID (unique) |
| `schema_uid` | VARCHAR(66) | Schema UID from EAS |
| `platform_id` | VARCHAR(100) | Platform identifier (e.g., "yelp", "amazon") |
| `item_id` | VARCHAR(255) | Platform's item identifier |
| `review_text` | TEXT | Review content |
| `rating` | SMALLINT | Rating (1-10) |
| `attestation_data` | JSONB | Full EAS attestation object |
| `attester_address` | VARCHAR(42) | Ethereum address of attester |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_platform_item` - Fast queries by platform and item
- `idx_platform` - Fast queries by platform
- `idx_attester` - Fast queries by attester address
- `idx_rating` - Fast queries by rating
- `idx_created_at` - Fast queries by creation date
- `idx_review_text_search` - Full-text search on review content

### Schemas Table

Stores registered EAS schemas.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `schema_uid` | VARCHAR(66) | EAS schema UID (unique) |
| `schema_name` | VARCHAR(100) | Schema name |
| `schema_string` | TEXT | Schema definition |
| `description` | TEXT | Schema description |
| `is_active` | BOOLEAN | Active status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

## Environment Variables Reference

| Variable | Description | Default / Value |
|----------|-------------|-----------------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | veryfiable |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `CORS_ORIGIN` | CORS allowed origins | * |
| `RPC_URL` | Base Sepolia RPC endpoint | https://sepolia.base.org |
| `PRIVATE_KEY` | Ethereum wallet private key | - |
| `EAS_CONTRACT_ADDRESS` | EAS contract address (Base Sepolia) | 0x4200000000000000000000000000000000000021 |
| `SCHEMA_REGISTRY_ADDRESS` | Schema registry address (Base Sepolia) | 0x4200000000000000000000000000000000000020 |
| `PUBLIC_REVIEW_SCHEMA_UID` | Public review schema UID (from registration) | - |
| `DEBUG` | Enable detailed error stack traces | false |

## Development Workflow

1. Make changes to the code
2. The server will auto-reload (if using `npm run dev`)
3. Test your changes with `curl` or Postman
4. Check logs for any errors

## Troubleshooting

### Database Connection Issues

If you see "Database connection failed":

1. Ensure PostgreSQL is running:
   ```bash
   sudo service postgresql status
   # or
   pg_ctl status
   ```

2. Verify database credentials in `.env`
3. Check if the database exists:
   ```bash
   psql -U postgres -l
   ```

### Port Already in Use

If port 3001 is already in use:

1. Change the `PORT` in `.env` to another port
2. Or kill the process using the port:
   ```bash
   lsof -ti:3001 | xargs kill
   ```

## Next Steps

- [ ] Implement attestation creation endpoint
- [ ] Implement attestation retrieval endpoints
- [ ] Add authentication/authorization
- [ ] Add rate limiting
- [ ] Add comprehensive testing

## License

See LICENSE file for details.

## Support

For issues and questions, please open an issue on the GitHub repository.
