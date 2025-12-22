document.addEventListener('DOMContentLoaded', () => {
    const stateSelect = document.getElementById('state');
    const citySelect = document.getElementById('city');
    const form = document.getElementById('recommendation-form');
    let locationsData = []; 
    const recommendationsContainer = document.getElementById('recent-recommendations');
    const fetchBtn = document.getElementById('fetch-farm-details-btn');
    const farmIdInput = document.getElementById('farmId');

    const askButton = document.getElementById('ask-btn');
    const chatInput = document.getElementById('chat-query');
    const chatWindow = document.querySelector('.chat-window');

    
    
    async function loadRecentRecommendations() {
        if (!recommendationsContainer) return;
        if (typeof USER_ID === 'undefined' || !USER_ID) {
            recommendationsContainer.innerHTML = '<p>Could not find user session.</p>';
            return;
        }
        try {
            const recommendations = await getRecentRecommendations(USER_ID);
            if (!recommendations || recommendations.length === 0) {
                recommendationsContainer.innerHTML = '<p>You have no recent recommendations.</p>';
                return;
            }
            recommendationsContainer.innerHTML = '';
            recommendations.forEach(rec => {
                const card = document.createElement('div');
                card.className = 'recommendation-card'; 
                const formattedDate = new Date(rec.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
                card.innerHTML = `<strong>${rec.recommendedCrop}</strong><span>${formattedDate}</span>`;
                recommendationsContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading recommendations:', error);
            recommendationsContainer.innerHTML = '<p>Could not load recommendations.</p>';
        }
    }


    async function populateStates() {
        if (!stateSelect) return;
        try {
            locationsData = await getLocations(); 
            locationsData.forEach(location => {
                const option = document.createElement('option');
                option.value = location.state;
                option.textContent = location.state;
                stateSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    }

    function populateCities(selectedStateName) {
        citySelect.innerHTML = '<option value="">Select City</option>'; 
        const selectedState = locationsData.find(s => s.state === selectedStateName);
        if (selectedState) {
            citySelect.disabled = false;
            selectedState.cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        } else {
            citySelect.disabled = true;
        }
    }

    if (stateSelect) {
        stateSelect.addEventListener('change', () => {
            populateCities(stateSelect.value);
        });
    }


    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (typeof USER_ID === 'undefined' || !USER_ID) {
                alert('Error: User session not found. Please log in again.');
                return;
            }
            const formData = {
                userId: USER_ID,
                soilPh: document.getElementById('soilPh').value,
                moisture: document.getElementById('moisture').value,
                nitrogen: document.getElementById('nitrogen').value,
                phosphorus: document.getElementById('phosphorus').value,
                potassium: document.getElementById('potassium').value,
                temperature: document.getElementById('temperature').value,
                area: document.getElementById('area').value,
                rainfall: document.getElementById('rainfall').value,
                season: document.getElementById('season').value,
                state: document.getElementById('state').value,
                city: document.getElementById('city').value,
                pastCrop: document.getElementById('pastCrop').value,
            };
            const result = await submitRecommendationRequest(formData);
            if (result) {
                localStorage.setItem('recommendationResult', JSON.stringify(result));
                window.location.href = '/recommend';
            } else {
                alert('Failed to get a recommendation. Please try again.');
            }
        });
    }

    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const farmId = farmIdInput.value.trim().toUpperCase();
            if (!farmId) {
                alert('Please enter a Farm ID.');
                return;
            }
            try {
                fetchBtn.disabled = true;
                fetchBtn.textContent = 'Fetching...';
                const response = await fetch(`/api/farm/${farmId}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        alert('Farm ID not found. Please check the ID and try again.');
                    } else {
                        throw new Error('Failed to fetch farm data.');
                    }
                    return;
                }
                const farmData = await response.json();
                document.getElementById('soilPh').value = farmData.soilPh;
                document.getElementById('moisture').value = farmData.moisture;
                document.getElementById('nitrogen').value = farmData.nitrogen;
                document.getElementById('phosphorus').value = farmData.phosphorus;
                document.getElementById('potassium').value = farmData.potassium;
                document.getElementById('temperature').value = farmData.temperature;
                document.getElementById('rainfall').value = farmData.rainfall;
                document.getElementById('state').value = farmData.state;
                populateCities(farmData.state);
                document.getElementById('city').value = farmData.city;
            } catch (error) {
                console.error('Error fetching farm details:', error);
                alert('An error occurred. Please try again.');
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.textContent = 'Fetch';
            }
        });
    }
    

    if (askButton) {
        askButton.addEventListener('click', handleChatSubmit);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleChatSubmit();
            }
        });
    }

    function handleChatSubmit() {
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        appendMessage(userMessage, 'user');
        chatInput.value = '';

        setTimeout(() => {
            const botResponse = getBotResponse(userMessage);
            appendMessage(botResponse, 'bot');
        }, 600);
    }

    function appendMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.textContent = message;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function getBotResponse(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('soil ph')) {
            return 'Soil pH is a measure of soil acidity or alkalinity. Most crops prefer a pH between 6.0 and 7.5.';
        }
        if (lowerMessage.includes('increase soil ph')) {
            return 'To increase soil pH (make it less acidic), you can add lime (calcium carbonate).';
        }
        if (lowerMessage.includes('decrease soil ph')) {
            return 'To decrease soil pH (make it more acidic), you can add sulfur or aluminum sulfate.';
        }
        if (lowerMessage.includes('wheat') && lowerMessage.includes('fertilizer')) {
            return 'For wheat, NPK (Nitrogen, Phosphorus, Potassium) in a balanced ratio (e.g., 12:32:16) is usually recommended at sowing.';
        }
        if (lowerMessage.includes('wheat')) {
            return 'Wheat is a Rabi crop, typically sown in winter (October-December) and harvested in spring (February-May).';
        }
        if (lowerMessage.includes('rice')) {
            return 'Rice is a Kharif crop that requires high rainfall and high humidity. It is usually grown in the monsoon season.';
        }
        if (lowerMessage.includes('kharif')) {
            return 'Kharif crops (monsoon crops) are grown from June to October. Examples include rice, maize, and cotton.';
        }
        if (lowerMessage.includes('rabi')) {
            return 'Rabi crops (winter crops) are sown from October to December. Examples include wheat, barley, and mustard.';
        }
        if (lowerMessage.includes('cotton') && lowerMessage.includes('disease')) {
            return 'A common disease in cotton is Boll Rot, which can be caused by fungi or bacteria. Proper spacing and fungicide application can help prevent it.';
        }
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return 'Hello! Ask me about crops, seasons, or soil health.';
        }

        return "Sorry, I'm just a simple bot. Try asking about 'soil ph', 'wheat', or 'kharif season'.";
    }

    populateStates(); 
    loadRecentRecommendations(); 
});