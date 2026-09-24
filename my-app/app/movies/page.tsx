import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic"; // always fetch fresh data

export default async function MoviesPage() {
    const { data: movies, error } = await supabase
        .from("movies")
        .select("*")
        .order("id");

    if (error) {
        return <p>Error loading movies: {error.message}</p>;
    }

    return (
        <main style={{ padding: "2rem" }}>
            <h1>Movies</h1>
            <ul>
                {movies?.map((movie) => (
                    <li key={movie.id}>
                        <strong>{movie.title}</strong> {movie.genre} ({movie.year})
                    </li>
                ))}
            </ul>
        </main>
    );
}