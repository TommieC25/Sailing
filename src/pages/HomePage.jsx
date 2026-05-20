import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

export default function HomePage() {
  const { user } = useAuth();
  const [outings, setOutings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOutings = async () => {
      try {
        const { data, error } = await supabase
          .from('outings')
          .select(
            `
            *,
            boats (
              name,
              boat_type,
              size_ft,
              capacity,
              owner_id
            ),
            skipper:users (
              full_name,
              photo_url
            )
          `
          )
          .gte('outing_date', new Date().toISOString().split('T')[0])
          .order('outing_date', { ascending: true })
          .limit(20);

        if (error) throw error;
        setOutings(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOutings();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to CGSC Sailing App
        </h2>
        <p className="text-gray-600 mb-6">
          Sign in to view upcoming outings and connect with other sailors.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading outings: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Outings</h1>
        <p className="text-gray-600">Find and join sailing adventures</p>
      </div>

      {outings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600">No outings scheduled yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outings.map((outing) => (
            <div key={outing.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{outing.title}</h3>
                <span className="text-xs bg-ocean-100 text-ocean-700 px-2 py-1 rounded">
                  {outing.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-gray-700">
                  <span className="text-sm font-medium">Boat:</span>
                  <span className="ml-2 text-sm">
                    {outing.boats?.name} ({outing.boats?.boat_type})
                  </span>
                </div>

                <div className="flex items-center text-gray-700">
                  <span className="text-sm font-medium">Date:</span>
                  <span className="ml-2 text-sm">
                    {new Date(outing.outing_date).toLocaleDateString()} at {outing.outing_time}
                  </span>
                </div>

                <div className="flex items-center text-gray-700">
                  <span className="text-sm font-medium">Skipper:</span>
                  <span className="ml-2 text-sm">
                    {outing.skipper?.full_name || 'TBD'}
                  </span>
                </div>

                <div className="flex items-center text-gray-700">
                  <span className="text-sm font-medium">Spots:</span>
                  <span className="ml-2 text-sm">
                    {outing.capacity_available} available
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {outing.description}
              </p>

              <Link
                to={`/outing/${outing.id}`}
                className="block w-full text-center bg-ocean-600 hover:bg-ocean-700 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
