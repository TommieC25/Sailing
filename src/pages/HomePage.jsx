import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';

export default function HomePage() {
  const { user, profile } = useAuth();
  const [outings, setOutings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOutings = async () => {
      try {
        const { data, error } = await supabase
          .from('outings')
          .select(`
            *,
            boats (name, boat_type, size_ft, capacity, owner_id),
            skipper:users (full_name, photo_url)
          `)
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

    if (user) fetchOutings();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to CGSC Sailing App</h2>
        <p className="text-gray-600 mb-6">Sign in to view upcoming outings and connect with other sailors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Welcome Banner */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
          Welcome to CGSC ⛵
        </h1>
        <p className="text-xl text-gray-600 font-medium">Where Sailors Meet Adventures</p>
      </div>

      {/* Ready to sail */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
        <p className="text-lg font-bold text-blue-900 mb-1">Ready to sail? 🌊</p>
        <p className="text-gray-700 text-base leading-relaxed">
          You're part of a community of sailors at Coconut Grove Sailing Club. Whether you own a boat or love crewing, this app connects you with people and outings.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">Here's How It Works</h2>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <p className="text-base font-bold text-gray-800 mb-2">🙋 If you crew <span className="font-normal text-gray-500">(no boat needed)</span></p>
          <div className="space-y-1 text-base text-gray-700">
            <p>Browse upcoming sailings → Find one that fits your schedule</p>
            <p>→ Request to join → Skipper approves → <strong>You're in!</strong></p>
            <p className="text-gray-500 text-sm mt-2">Chat with your crew before you go, share photos after.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-base font-bold text-gray-800 mb-2">🚢 If you own a boat</p>
          <div className="space-y-1 text-base text-gray-700">
            <p>Post your upcoming outing → Crew members request to join</p>
            <p>→ You pick who comes → <strong>Manage from your dashboard.</strong></p>
          </div>
        </div>
      </div>

      {/* What you can do */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">What You Can Do Right Now</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {[
            { emoji: '🧭', title: 'Browse Outings', desc: 'See all upcoming sails. Tap any one to learn more.' },
            { emoji: '⛵', title: 'Request to Join', desc: 'Found one you like? Ask the skipper if you can crew.' },
            { emoji: '👥', title: 'See Your Crew', desc: 'Once approved, chat and share photos with your crew.' },
            { emoji: '📋', title: 'Manage Your Boat', desc: 'Owners can post outings and approve crew from "My Outings".' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-4">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-bold text-gray-900 text-base">{title}</p>
                <p className="text-gray-600 text-sm mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Getting started */}
      <div className="mb-8">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-3">
          {[
            { n: '1', text: 'Complete your profile — Add a photo and tell us about your sailing experience.' },
            { n: '2', text: 'Browse outings — Tap "Outings" to see what\'s sailing this week.' },
            { n: '3', text: 'Request to join — Found something fun? Request it. Skippers respond fast.' },
            { n: '4', text: 'Show up and sail — That\'s it. Enjoy the water. 🌅' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{background: '#0c2340'}}>{n}</span>
              <p className="text-gray-700 text-base pt-0.5">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Outings list */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">Upcoming Outings</h2>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {!loading && outings.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">⛵</p>
            <p className="text-gray-600 font-medium">No outings scheduled yet.</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon or post one yourself!</p>
          </div>
        )}

        {!loading && outings.length > 0 && (
          <div className="space-y-4">
            {outings.map((outing) => (
              <div key={outing.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{outing.title}</h3>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0">
                    {outing.status}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3 text-sm text-gray-600">
                  <p>🚢 <span className="font-medium">{outing.boats?.name}</span> · {outing.boats?.boat_type}</p>
                  <p>📅 <span className="font-medium">{new Date(outing.outing_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span> at {outing.outing_time}</p>
                  <p>👤 Skipper: <span className="font-medium">{outing.skipper?.full_name || 'TBD'}</span></p>
                  <p>🙋 <span className="font-medium">{outing.capacity_available} spots</span> available</p>
                </div>

                {outing.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{outing.description}</p>
                )}

                <Link
                  to={`/outing/${outing.id}`}
                  className="block w-full text-center py-3 rounded-xl text-base font-bold text-white transition"
                  style={{background: 'linear-gradient(135deg, #0c2340, #0369a1)'}}
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
