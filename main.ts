import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// Endpoint JSON AniList
app.get("/api/anilist", async (_ctx) => {
  const anilistQuery = `
    query {
      User(id: 6786326) {
        name
        avatar {
          large
        }
        statistics {
          anime { count episodesWatched minutesWatched }
          manga { count chaptersRead volumesRead }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query: anilistQuery }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "AniList request failed",
          status: response.status,
          statusText: response.statusText,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const result = await response.json();

    if (!result.data || result.errors) {
      return new Response(
        JSON.stringify({
          widget_error: "AniList rejected the request.",
          anilist_response: result,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const user = result.data.User;
    const animeStats = user.statistics.anime;
    const mangaStats = user.statistics.manga;

    const flatStats = {
      username: user.name,
      avatar_url: user.avatar.large,
      total_anime: animeStats.count,
      episodes_watched: animeStats.episodesWatched,
      days_watched: Number((animeStats.minutesWatched / 1440).toFixed(1)),
      total_manga: mangaStats.count,
      volumes_read: mangaStats.volumesRead,
      chapters_read: mangaStats.chaptersRead,
    };

    return new Response(JSON.stringify(flatStats), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Worker crashed",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});

// Include file-system based routes here
app.fsRoutes();
