document.addEventListener('DOMContentLoaded', () => {
    const resultData = JSON.parse(localStorage.getItem('recommendationResult'));

    if (!resultData) {
        document.querySelector('main.container').innerHTML = '<h2>No recommendation data found. Please go back to the dashboard and submit the form.</h2>';
        return;
    }

    const yieldValue = (Math.random() * 5 + 2).toFixed(2);
    const investmentValue = Math.floor(Math.random() * 20000 + 30000);
    const revenueValue = investmentValue + Math.floor(Math.random() * 40000 + 20000);
    const netProfitValue = revenueValue - investmentValue;

    document.getElementById('crop-name').textContent = resultData.recommendedCrop;
    document.getElementById('crop-reason').textContent = resultData.reason;
    document.getElementById('yield').textContent = yieldValue;
    document.getElementById('sustainability').textContent = (Math.random() * 20 + 75).toFixed(0);
    document.getElementById('profit-potential').textContent = ['High', 'Medium', 'Very High'][Math.floor(Math.random() * 3)];
    document.getElementById('gross-revenue').textContent = revenueValue.toLocaleString('en-IN');
    document.getElementById('investment').textContent = investmentValue.toLocaleString('en-IN');
    document.getElementById('net-profit').textContent = netProfitValue.toLocaleString('en-IN');

    const pieCtx = document.getElementById('profit-pie-chart').getContext('2d');
    new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Net Profit', 'Investment Cost'],
            datasets: [{
                data: [netProfitValue, investmentValue],
                backgroundColor: ['#2E8B57', '#F4A460'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const barCtx = document.getElementById('yield-bar-chart').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: [resultData.recommendedCrop, 'Wheat (Avg)', 'Rice (Avg)', 'Maize (Avg)'],
            datasets: [{
                label: 'Yield (Tonnes per Hectare)',
                data: [yieldValue, 2.8, 3.5, 3.2],
                backgroundColor: ['#2E8B57', '#a9a9a9', '#a9a9a9', '#a9a9a9'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
});