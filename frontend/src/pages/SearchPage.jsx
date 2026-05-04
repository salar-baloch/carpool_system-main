import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Maps from "../components/Maps";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search?";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function SearchPage() {
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: "",
  });

  const [searchResults, setSearchResults] = useState([]);
  const [originCoordinates, setOriginCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Autosuggestion states
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [debouncedOrigin, setDebouncedOrigin] = useState("");
  const [debouncedDestination, setDebouncedDestination] = useState("");

  // Debounce for origin
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOrigin(formData.from);
    }, 500);

    return () => clearTimeout(handler);
  }, [formData.from]);

  // Debounce for destination
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDestination(formData.to);
    }, 500);

    return () => clearTimeout(handler);
  }, [formData.to]);

  // Fetch suggestions
  const fetchSuggestions = async (query, type) => {
    if (!query) {
      if (type === "origin") setOriginSuggestions([]);
      if (type === "destination") setDestinationSuggestions([]);
      return;
    }

    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (type === "origin") {
        setOriginSuggestions(data);
      } else if (type === "destination") {
        setDestinationSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  // Fetch origin suggestions whenever debouncedOrigin changes
  useEffect(() => {
    fetchSuggestions(debouncedOrigin, "origin");
  }, [debouncedOrigin]);

  // Fetch destination suggestions whenever debouncedDestination changes
  useEffect(() => {
    fetchSuggestions(debouncedDestination, "destination");
  }, [debouncedDestination]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSearch = async () => {
    if (!formData.from || !formData.to || !formData.date) {
      toast.error("Please fill out all fields");
      return;
    }

    const searchDate = String(formData.date).split("T")[0];

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/search-rides?from=${encodeURIComponent(formData.from)}&to=${encodeURIComponent(formData.to)}&date=${encodeURIComponent(searchDate)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data);
        setSearchTriggered(true);
      } else {
        toast.error(data.message || "Error fetching rides");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while searching for rides");
    }
  };

  const handleRequestRide = async (rideId) => {
    try {
      const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/request-ride`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shareId: rideId, message: "Requesting this ride" }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("Ride request raised successfully");
      } else {
        toast.error(data.message || "Error raising ride request");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while raising the ride request");
    }
  };

  const handleSuggestionClick = async (suggestion, type) => {
    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set("q", suggestion.display_name);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        if (type === "origin") {
          setFormData({ ...formData, from: suggestion.display_name });
          setOriginCoordinates([parseFloat(lat), parseFloat(lon)]);
          setOriginSuggestions([]);
        } else if (type === "destination") {
          setFormData({ ...formData, to: suggestion.display_name });
          setDestinationCoordinates([parseFloat(lat), parseFloat(lon)]);
          setDestinationSuggestions([]);
        }
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl bg-white shadow-lg border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Search for Rides</h2>
        <div>
          <label className="text-sm font-semibold text-slate-700">From</label>
          <Input
            type="text"
            name="from"
            value={formData.from}
            onChange={handleChange}
            className="mt-2 mb-2"
            placeholder="Enter a location"
          />
          {originSuggestions.length > 0 && (
            <ul className="bg-white shadow-lg max-h-60 overflow-auto w-full mt-2 rounded-lg z-20">
              {originSuggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSuggestionClick(suggestion, "origin")}
                >
                  {suggestion.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">To</label>
          <Input
            type="text"
            name="to"
            value={formData.to}
            onChange={handleChange}
            className="mt-2 mb-2"
            placeholder="Enter destination"
          />
          {destinationSuggestions.length > 0 && (
            <ul className="bg-white shadow-lg max-h-60 overflow-auto w-full mt-2 rounded-lg z-20">
              {destinationSuggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSuggestionClick(suggestion, "destination")}
                >
                  {suggestion.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Date</label>
          <Input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="mt-2 mb-4"
          />
        </div>
        <Button onClick={handleSearch} className="w-full">
          Search
        </Button>
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Search Results</h3>
          {searchResults.length > 0 ? (
            searchResults.map((ride, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-3">
                <p className="font-semibold text-slate-900">{ride.origin} → {ride.destination}</p>
                <p className="text-sm text-slate-600">
                  {new Date(ride.departureTime).toLocaleDateString()} · {new Date(ride.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                {ride.message && (
                  <p className="mt-2 text-sm text-slate-600">Message: {ride.message}</p>
                )}
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Price: {ride.price !== null && ride.price !== undefined ? `PKR ${ride.price}` : 'Not specified'}
                </p>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Spots: {ride.spots}</span>
                  <span className="flex items-center gap-2">
                    Driver: {ride.driver.firstName} {ride.driver.lastName}
                    {ride.driver.isVerified ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Verified
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Not verified
                      </span>
                    )}
                  </span>
                </div>
                <Button
                  onClick={() => handleRequestRide(ride.id)}
                  variant="success"
                  className="mt-3 w-full"
                >
                  Request Ride
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No rides found</p>
          )}
        </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden">
          <div className="h-[70vh]">
            <Maps
              originCoordinates={originCoordinates}
              destinationCoordinates={destinationCoordinates}
              searchTriggered={searchTriggered}
            />
          </div>
        </div>
        <ToastContainer />
      </div>
    </div>
  );
}

export default SearchPage;