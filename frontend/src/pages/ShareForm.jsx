import { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Maps from "../components/Maps";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search?";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const SHARE_DRAFT_KEY = "carpool_share_form_draft";

const ShareForm = () => {
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    departureDate: "",
    departureTime: "",
    spots: "",
    message: "",
    contactNumber: "",
    price: "",
  });

  const [originCoordinates, setOriginCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [debouncedOrigin, setDebouncedOrigin] = useState("");
  const [debouncedDestination, setDebouncedDestination] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SHARE_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore invalid draft data
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SHARE_DRAFT_KEY, JSON.stringify(formData));
    } catch {
      // ignore storage write errors
    }
  }, [formData]);

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

  const handleSearchClick = () => {
    if (formData.from && formData.to) {
      setSearchTriggered(true);
    } else {
      alert("Please select both origin and destination");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formData.departureDate || !formData.departureTime) {
      toast.error("Please choose both date and time for departure.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE}/create-trip`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Trip shared successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.log("Trip created:", response.data);
      try {
        localStorage.removeItem(SHARE_DRAFT_KEY);
      } catch {
        // ignore storage errors
      }
      setFormData({
        from: "",
        to: "",
        departureDate: "",
        departureTime: "",
        spots: "",
        message: "",
        contactNumber: "",
        price: "",
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      toast.error("Failed to create trip. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl w-full shadow-lg border border-slate-100">
        <div>
          <label className="block text-sm font-semibold text-slate-700">From</label>
          <Input
            type="text"
            name="from"
            value={formData.from}
            onChange={handleChange}
            placeholder="Type the name of a place"
            className="mt-2"
          />
          {originSuggestions.length > 0 && (
            <ul className="bg-white shadow-lg max-h-60 overflow-auto w-full mt-2 rounded-lg z-20">
              {originSuggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => {
                    setFormData({ ...formData, from: suggestion.display_name });
                    setOriginCoordinates([suggestion.lat, suggestion.lon]);
                    setOriginSuggestions([]);
                  }}
                >
                  {suggestion.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">To</label>
          <Input
            type="text"
            name="to"
            value={formData.to}
            onChange={handleChange}
            placeholder="Type the name of a place"
            className="mt-2"
          />
          {destinationSuggestions.length > 0 && (
            <ul className="bg-white shadow-lg max-h-60 overflow-auto w-full mt-2 rounded-lg z-20">
              {destinationSuggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => {
                    setFormData({ ...formData, to: suggestion.display_name });
                    setDestinationCoordinates([suggestion.lat, suggestion.lon]);
                    setDestinationSuggestions([]);
                  }}
                >
                  {suggestion.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Departure</label>
          <div className="flex space-x-2">
            <Input
              type="date"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleChange}
              className="w-1/2"
            />
            <Input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
              className="w-1/2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Spots in Your Car</label>
          <Input
            type="number"
            name="spots"
            value={formData.spots}
            onChange={handleChange}
            placeholder="Number of spots"
            className="mt-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Price (per seat, PKR)</label>
          <Input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter price in PKR"
            className="mt-2"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Message</label>
          <p className="mt-1 text-xs text-slate-500">
            Add your contact number and a short message for riders before posting.
          </p>
          <Textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Message..."
            className="mt-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Contact Number</label>
          <Input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            placeholder="Enter your phone number"
            className="mt-2"
          />
        </div>
        <Button type="button" onClick={handleSearchClick} className="w-full">
          Search
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={handleSubmit}>
          Share
        </Button>
      </form>

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
};

export default ShareForm;