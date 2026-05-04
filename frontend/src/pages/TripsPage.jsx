import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from '../components/ui/Button';

const TripsPage = () => {
  const [drivingTrips, setDrivingTrips] = useState([]);
  const [ridingTrips, setRidingTrips] = useState([]);
  const [loadingDriving, setLoadingDriving] = useState(true);
  const [loadingRiding, setLoadingRiding] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  // Fetch Driving trips
  const fetchDrivingTrips = async () => {
    setLoadingDriving(true);
    try {
      const response = await fetch(`${API_BASE}/trips/driving`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setDrivingTrips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching driving trips:', error);
    } finally {
      setLoadingDriving(false);
    }
  };

  // Fetch Riding trips
  const fetchRidingTrips = async () => {
    setLoadingRiding(true);
    try {
      const response = await fetch(`${API_BASE}/trips/riding`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setRidingTrips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching riding trips:', error);
    } finally {
      setLoadingRiding(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Handle request status change
  const handleRequestStatusChange = async (requestId, status) => {
    try {
      const response = await fetch(`${API_BASE}/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to update request');
      }
      toast.success(`Request ${status.toLowerCase()} successfully.`);
      // Re-fetch trips to update the UI
      await fetchDrivingTrips();
    } catch (error) {
      toast.error(error.message || 'Failed to update request');
      console.error('Error updating request status:', error);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Delete this ride? Riders with approved requests will be notified.')) {
      return;
    }
    try {
      await fetch(`${API_BASE}/trips/${tripId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchDrivingTrips();
      await fetchNotifications();
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  useEffect(() => {
    fetchDrivingTrips();
    fetchRidingTrips();
    fetchNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <ToastContainer />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trips</h2>
          <p className="text-slate-600">Manage your driving requests and track rides you requested.</p>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
          </div>
          <div className="px-6 py-4">
            {loadingNotifications ? (
              <p className="text-sm text-slate-500">Loading notifications...</p>
            ) : notifications.length > 0 ? (
              <ul className="space-y-3">
                {notifications.map((notification) => (
                  <li key={notification.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{notification.message}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No notifications yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Driving requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Origin</th>
                  <th className="px-6 py-3">Destination</th>
                  <th className="px-6 py-3">Price (PKR)</th>
                  <th className="px-6 py-3">Rider</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingDriving ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-6 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : (
                  drivingTrips.map((trip) =>
                    trip.requests && trip.requests.length > 0 ? (
                      trip.requests.map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{trip.origin}</td>
                          <td className="px-6 py-4 text-slate-600">{trip.destination}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {trip.price !== null && trip.price !== undefined ? `PKR ${trip.price}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="flex flex-wrap items-center gap-2">
                              {request.user?.firstName} {request.user?.lastName}
                              {request.user?.isVerified ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  Verified
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                  Not verified
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{request.status}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {request.status === 'PENDING' && (
                                <>
                                  <Button
                                    variant="danger"
                                    onClick={() => handleRequestStatusChange(request.id, 'DECLINED')}
                                  >
                                    Decline
                                  </Button>
                                  <Button
                                    variant="warning"
                                    onClick={() => handleRequestStatusChange(request.id, 'PENDING')}
                                  >
                                    Ignore
                                  </Button>
                                  <Button
                                    variant="success"
                                    onClick={() => handleRequestStatusChange(request.id, 'APPROVED')}
                                  >
                                    Accept
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="secondary"
                                onClick={() => handleDeleteTrip(trip.id)}
                              >
                                Delete ride
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr key={trip.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{trip.origin}</td>
                        <td className="px-6 py-4 text-slate-600">{trip.destination}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {trip.price !== null && trip.price !== undefined ? `PKR ${trip.price}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 italic">No riders yet</td>
                        <td className="px-6 py-4 text-slate-500">-</td>
                        <td className="px-6 py-4">
                          <Button
                            variant="secondary"
                            onClick={() => handleDeleteTrip(trip.id)}
                          >
                            Delete ride
                          </Button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Riding status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Origin</th>
                  <th className="px-6 py-3">Destination</th>
                  <th className="px-6 py-3">Departure</th>
                  <th className="px-6 py-3">Price (PKR)</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRiding ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-6 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : (
                  ridingTrips.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{request.share.origin}</td>
                      <td className="px-6 py-4 text-slate-600">{request.share.destination}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(request.share.departureTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {request.share.price !== null && request.share.price !== undefined ? `PKR ${request.share.price}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {request.status === 'APPROVED' ? (request.share.contactNumber || 'N/A') : 'Visible after approval'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{request.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TripsPage;