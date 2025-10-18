import React, { useState } from "react";
import API from "../../api";
import "../../styles/CreatorDashboard.css";

const CreateDashboard = () => {
  const [pathTitle, setPathTitle] = useState("");
  const [resources, setResources] = useState([]);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);

  const [newResource, setNewResource] = useState({
    title: "",
    url: "",
    description: "",
    estimatedTime: "",
  });

  // Add resource to path
  const addResource = () => {
    if (!newResource.title || !newResource.url) {
      alert("Title and URL are required!");
      return;
    }
    setResources([...resources, newResource]);
    setNewResource({ title: "", url: "", description: "", estimatedTime: "" });
  };

  // Remove resource
  const removeResource = (index) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  // Submit Learning Path
  const submitPath = async () => {
    if (!pathTitle || resources.length === 0) {
      alert("Path title and at least one resource are required!");
      return;
    }

    if (!image) {
      alert("Please upload an image for the learning path!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", pathTitle);
      formData.append("resources", JSON.stringify(resources));
      formData.append("image", image);

      const res = await API.post("/creator/learning-paths", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Learning Path Response:", res.data);
      setMessage("Learning Path created successfully!");
      setPathTitle("");
      setResources([]);
      setImage(null);
    } catch (err) {
      console.error("Error creating learning path:", err.response || err);
      alert(err.response?.data?.message || "Error creating learning path");
    }
  };

  return (
    <div className="creator-dashboard">
      <h2>Create Learning Path</h2>

      <input
        type="text"
        placeholder="Path Title"
        value={pathTitle}
        onChange={(e) => setPathTitle(e.target.value)}
      />

      <h3>Upload Image</h3>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
      />

      <h3>Add Resource</h3>
      <input
        type="text"
        placeholder="Title"
        value={newResource.title}
        onChange={(e) =>
          setNewResource({ ...newResource, title: e.target.value })
        }
      />
      <input
        type="text"
        placeholder="URL"
        value={newResource.url}
        onChange={(e) =>
          setNewResource({ ...newResource, url: e.target.value })
        }
      />
      <input
        type="text"
        placeholder="Description"
        value={newResource.description}
        onChange={(e) =>
          setNewResource({ ...newResource, description: e.target.value })
        }
      />
      <input
        type="number"
        placeholder="Estimated Time (minutes)"
        value={newResource.estimatedTime}
        onChange={(e) =>
          setNewResource({ ...newResource, estimatedTime: e.target.value })
        }
      />
      <button onClick={addResource}>Add Resource</button>

      {resources.length > 0 && (
        <div>
          <h3>Resources</h3>
          <ul>
            {resources.map((res, i) => (
              <li key={i}>
                {res.title} - {res.url} - {res.estimatedTime} mins
                <button onClick={() => removeResource(i)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={submitPath}>Create Learning Path</button>

      {message && <p style={{ color: "green" }}>{message}</p>}
    </div>
  );
};

export default CreateDashboard;
