# YouTube Discord Notifier Bot

## Project Overview
A Discord bot that monitors YouTube channels and sends notifications to Discord channels when new videos are uploaded.

## Current Status
- Bot implementation complete and ready to run
- Waiting for Discord and YouTube API credentials

## ⚠️ Integration Note
Discord integration was dismissed - credentials must be manually added as Replit Secrets instead.

## Setup Instructions (Required)

### Step 1: Get Discord Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" section and click "Add Bot"
4. Under TOKEN, click "Copy"
5. Add to Replit Secrets as `DISCORD_TOKEN`

### Step 2: Get YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create an API key (Credentials > API key)
5. Add to Replit Secrets as `YOUTUBE_API_KEY`

### Step 3: Invite Bot to Discord Server
1. In Developer Portal, go to OAuth2 > URL Generator
2. Select scopes: `bot`
3. Select permissions: `Send Messages`, `Embed Links`, `Read Message History`
4. Copy the generated URL and open it to invite the bot to your server

## Bot Commands

- `!subscribe <YOUTUBE_CHANNEL_ID>` - Subscribe to new uploads
- `!subscriptions` - View all subscriptions in current channel
- `!unsubscribe <YOUTUBE_CHANNEL_ID>` - Unsubscribe from a channel

## Finding YouTube Channel IDs

1. Go to a YouTube channel
2. Click "About"
3. The URL shows: `youtube.com/@channelname` or `youtube.com/channel/CHANNEL_ID`
4. Use the ID after `/channel/`

Example: `UCBJycsmduvf2EL7D87IRLgA`

## Features

✓ Monitor multiple YouTube channels  
✓ Get notified in Discord with video details  
✓ Easy subscribe/unsubscribe commands  
✓ Checks for new videos every 5 minutes
