# Yoruba Proverb API

A RESTful API providing a collection of Yoruba proverbs with their translations and wisdom insights.

## About

This API serves traditional Yoruba proverbs from Nigeria, complete with English translations and explanations of their wisdom. Yoruba proverbs are an important part of the cultural heritage and contain deep philosophical insights and practical wisdom.

## Features

- Get a random proverb
- Fetch a specific proverb by ID
- JSON response format with proverb text, translation, and wisdom explanation
- Email subscription for receiving proverbs
- Welcome emails for new subscribers
- Batch email delivery of proverbs to subscribers

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Docker (optional)

## API Endpoints

### Base URL

```
http://localhost:3000
```

### Routes

| Method | Endpoint              | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| GET    | `/`                   | Welcome message                              |
| GET    | `/proverb`            | Fetch a random proverb                       |
| GET    | `/proverb/:id`        | Fetch a specific proverb by ID               |
| POST   | `/subscribe`          | Subscribe to receive proverb emails          |
| GET    | `/unsubscribe`        | Unsubscribe from proverb emails              |
| POST   | `/admin/send-proverb` | Send proverbs to all subscribers (protected) |

### Response Format

```json
{
  "id": 1,
  "proverb": "Ká dijú ká ṣe bí ẹní kú, ká wo ẹni tí yóò sunkún ẹni; ká sáré ṣẹ́ṣẹ́ ká fẹsẹ̀ kọ, ká wo ẹni tí yóò ṣeni pẹ̀lẹ́.",
  "translation": "Close your eyes and feign death to see who'll mourn you; run and be ensure you trip to see those who truly care.",
  "wisdom": "Adversities often show true friends."
}
```

### Subscription Request Format

```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Email Features

The API includes email functionality using Resend:

1. **Welcome Emails**: New subscribers receive a welcome email with a random Yoruba proverb.
2. **Weekly Proverbs**: Admin can send batch emails with proverbs to all active subscribers every Saturday.
3. **Unsubscribe Functionality**: Users can easily unsubscribe using a link in every email.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/yoruba-proverb-api-v2.git
cd yoruba-proverb-api-v2
```

2. Install dependencies

```bash
npm install
```

3. Run in development mode

```bash
npm run dev
```

4. Build and run in production

```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`.

## Development

```bash
# Run in development mode with hot reloading
npm run dev

# Build the project
npm run build

# Start the server
npm start
```

## Data Structure

Each proverb includes:

- Unique ID
- Original Yoruba proverb
- English translation
- Wisdom explanation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the package.json file for details.

## Acknowledgments

- Thanks to all contributors who add and verify proverbs
- Inspired by the rich cultural heritage of the Yoruba people

### Environment Variables

Create a `.env` file based on `.env.example` with the following variables:

```
PORT=3000
API_BASE_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key_here
AUDIENCE_ID=your_audience_id_here
EMAIL_FROM=Yoruba Proverbs <proverbs@yourubaproverbs.com>
```
