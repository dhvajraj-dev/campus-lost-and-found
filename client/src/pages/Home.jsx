import { useEffect, useState } from "react";
import api from "../services/api";

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemType, setItemType] = useState("");
  const [search, setSearch] = useState("");

  const loadItems = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (itemType) {
        params.itemType = itemType;
      }

      if (search) {
        params.search = search;
      }

      const response = await api.get("/items", { params });
      setItems(response.data.items);
    } catch (error) {
      setError("Could not load items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [itemType]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold">
            Thunder Bay Campus Lost & Found
          </h1>
          <p className="mt-2 text-blue-100">
            Report lost items and find items that have been found on campus.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />

            <select
              value={itemType}
              onChange={(event) => setItemType(event.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Items</option>
              <option value="Lost">Lost Items</option>
              <option value="Found">Found Items</option>
            </select>

            <button
              onClick={loadItems}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-center text-gray-600">Loading items...</p>
        )}

        {error && (
          <p className="text-center text-red-600 font-medium">{error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-center text-gray-600">
            No items have been reported yet.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.ItemId}
              className="bg-white rounded-lg shadow p-5 flex flex-col"
            >
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                  item.ItemType === "Lost"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {item.ItemType}
              </span>

              <h2 className="text-lg font-semibold text-gray-900">
                {item.Title}
              </h2>

              <p className="text-gray-600 mt-2 flex-1">
                {item.Description || "No description provided."}
              </p>

              <div className="mt-4 text-sm text-gray-500">
                <p>
                  <strong>Category:</strong> {item.Category}
                </p>
                <p>
                  <strong>Location:</strong> {item.Location}
                </p>
                <p>
                  <strong>Date:</strong> {item.ItemDate?.split("T")[0]}
                </p>
                <p>
                  <strong>Status:</strong> {item.Status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}