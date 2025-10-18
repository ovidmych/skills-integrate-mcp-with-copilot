document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const loginModal = document.getElementById("login-modal");
  const closeModal = document.getElementById("close-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const userInfo = document.getElementById("user-info");
  const userNameSpan = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const teacherControls = document.getElementById("teacher-controls");
  const studentView = document.getElementById("student-view");
  const loginSection = document.getElementById("login-section");

  // Authentication state
  let isAuthenticated = false;
  let currentUser = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only for authenticated users
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = isAuthenticated 
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : '';
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if authenticated)
      if (isAuthenticated) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Authentication functions
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const result = await response.json();
      
      if (result.authenticated) {
        isAuthenticated = true;
        currentUser = result.user;
        showAuthenticatedUI();
      } else {
        isAuthenticated = false;
        currentUser = null;
        showUnauthenticatedUI();
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      showUnauthenticatedUI();
    }
  }

  function showAuthenticatedUI() {
    userInfo.classList.remove("hidden");
    loginSection.classList.add("hidden");
    teacherControls.classList.remove("hidden");
    studentView.classList.add("hidden");
    userNameSpan.textContent = `Welcome, ${currentUser.name}`;
  }

  function showUnauthenticatedUI() {
    userInfo.classList.add("hidden");
    loginSection.classList.remove("hidden");
    teacherControls.classList.add("hidden");
    studentView.classList.remove("hidden");
  }

  // Login modal handlers
  userIcon.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      closeModal.click();
    }
  });

  // Login form handler
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok) {
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        setTimeout(() => {
          loginModal.classList.add("hidden");
          loginForm.reset();
          loginMessage.classList.add("hidden");
          checkAuthStatus();
          fetchActivities(); // Refresh activities to show delete buttons
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
      checkAuthStatus();
      fetchActivities(); // Refresh activities to hide delete buttons
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  // Initialize app
  checkAuthStatus().then(() => {
    fetchActivities();
  });
});
