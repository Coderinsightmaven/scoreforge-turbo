# Convex Hosting Cost Estimate

## Convex Pricing Model

- **Free tier**: 1M function calls/month, 1GB storage, 1GB bandwidth
- **Pro tier**: $25/month base, then usage-based pricing

## ScoreForge Usage Profile

| Feature | Convex Usage | Notes |
|---------|--------------|-------|
| Real-time scoreboards | High | Reactive queries on every point scored |
| Bracket views | Medium | Queries on page load + subscriptions |
| Tournament management | Low | Occasional CRUD operations |
| Auth/Users | Low | Login/signup, preference syncs |

## Cost Estimates by Scale

| Scale | Users | Tournaments/Month | Monthly Cost |
|-------|-------|-------------------|--------------|
| Hobby | <50 | 1-5 | **Free** ($0) |
| Small Club | ~200 | 10-20 | **Free - $25** |
| Active League | ~500 | 50+ with frequent live scoring | **$25-50** |
| Large Organization | 1000+ | 100s of tournaments | **$50-150+** |

## Main Cost Drivers

1. **Live Scoring** - Each point scored triggers mutations + real-time updates to all spectators
2. **Spectator Count** - More viewers watching live matches = more reactive query bandwidth
3. **Match Concurrency** - Multiple simultaneous live matches multiply the above costs

## Recommendations

- **Start on Free tier** - Sufficient for development and small-scale use
- **Monitor usage** in Convex dashboard before upgrading
- **Optimize if needed**:
  - Debounce rapid score updates
  - Limit real-time subscriptions for completed matches
  - Use pagination for large tournament lists

## Convex Pricing Resources

- [Convex Pricing Page](https://www.convex.dev/pricing)
- [Convex Usage Dashboard](https://dashboard.convex.dev)
