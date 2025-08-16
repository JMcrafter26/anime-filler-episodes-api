import * as cheerio from 'cheerio';

function expandRange(range) {
  const [start, end] = range.split('-').map(Number);
  const expandedRange = [];
  for (let i = start; i <= end; i++) {
    expandedRange.push(i);
  }
  return expandedRange.join(', ');
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Root route: dashboard page
    if (url.pathname === "/") {
      return new Response(`<!doctype html>
      <html>
      <head><title>ChaiWala API</title></head>
      <body style="background:black;color:white;font-family:sans-serif">
        <h1 style="color:#00ff4c">API Dashboard</h1>
        <p>The ChaiWala Filler API provides access to anime filler episode data.</p>
        <p><code>/{anime-name}</code> - Get filler list for anime</p>
        <p><a href="https://discord.gg/V8QWSyVx88">Support Discord</a></p>
      </body>
      </html>`, { headers: { "content-type": "text/html" } });
    }

    // Dynamic route: /{animeName}
    const animeName = url.pathname.slice(1);
    if (!animeName) {
      return new Response("Error: Anime name is missing", { status: 400 });
    }

    try {
      const response = await fetch(`https://www.animefillerlist.com/shows/${animeName}`);
      if (!response.ok) {
        return new Response("Failed to fetch anime data", { status: 500 });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const fillerEpisodes = [];
      const cannonEpisodes = [];

      $('div.filler span.Label').each((_, element) => {
        if ($(element).text().trim() === 'Filler Episodes:') {
          const fillerEpisode = $(element).next().text().trim();
          const episodes = fillerEpisode.split(',').map(ep =>
            ep.includes('-') ? expandRange(ep.trim()) : ep.trim()
          );
          fillerEpisodes.push(episodes.join(', '));
        }
      });

      $('div.mixed_canon\\/filler span.Label').each((_, element) => {
        if ($(element).text().trim() === 'Mixed Canon/Filler Episodes:') {
          const cannonEpisode = $(element).next().text().trim();
          const episodes = cannonEpisode.split(',').map(ep =>
            ep.includes('-') ? expandRange(ep.trim()) : ep.trim()
          );
          cannonEpisodes.push(episodes.join(', '));
        }
      });

      return new Response(JSON.stringify({ animeName, fillerEpisodes, cannonEpisodes }), {
        headers: { "content-type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
  }
};
