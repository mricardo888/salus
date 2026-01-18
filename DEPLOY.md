# Salus Heroku Deployment Guide

## Quick Deploy Commands

```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create salusify --stack heroku-24

# 3. Add buildpacks (Node first for frontend build, then Python)
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python

# 4. Set environment variables
heroku config:set GEMINI_API_KEY=your_api_key_here
heroku config:set MONGO_URI=your_mongodb_uri_here
heroku config:set NODE_ENV=production

# 5. Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# 6. Open app
heroku open
```

## Connect Custom Domain (salusify.tech)

```bash
# Add domain to Heroku
heroku domains:add salusify.tech
heroku domains:add www.salusify.tech
```

This will give you DNS targets. Then in your domain registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | @ | [dns-target-from-heroku].herokudns.com |
| CNAME | www | [dns-target-from-heroku].herokudns.com |

## Enable SSL
```bash
heroku certs:auto:enable
```

## View Logs
```bash
heroku logs --tail
```
