document.addEventListener('DOMContentLoaded', () => {
    const yearFilter = document.getElementById('year-filter');
    let cropsChart, seasonChart, farmersChart;

    async function fetchAndRenderCharts(year) {
        const apiUrl = `/api/analytics?year=${year}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch analytics data');
            const data = await response.json();

            if (cropsChart) cropsChart.destroy();
            if (seasonChart) seasonChart.destroy();
            if (farmersChart) farmersChart.destroy();

            const cropsCtx = document.getElementById('crops-chart').getContext('2d');
            cropsChart = new Chart(cropsCtx, {
                type: 'doughnut',
                data: {
                    labels: data.mostRecommendedCrops.map(c => c._id),
                    datasets: [{ data: data.mostRecommendedCrops.map(c => c.count), backgroundColor: ['#2E8B57', '#F4A460', '#6B8E23', '#8FBC8F'] }]
                }
            });

            const seasonCtx = document.getElementById('season-chart').getContext('2d');
            seasonChart = new Chart(seasonCtx, {
                type: 'pie',
                data: {
                    labels: data.recommendationsBySeason.map(s => s._id),
                    datasets: [{ data: data.recommendationsBySeason.map(s => s.count), backgroundColor: ['#8FBC8F', '#CD853F', '#A0522D'] }]
                }
            });

            const farmersCtx = document.getElementById('farmers-chart').getContext('2d');
            farmersChart = new Chart(farmersCtx, {
                type: 'line',
                data: {
                    labels: data.farmerGrowthByMonth.map(item => item.label),
                    datasets: [{
                        label: 'Farmer Engagement Growth',
                        data: data.farmerGrowthByMonth.map(item => item.count),
                        borderColor: '#2E8B57',
                        fill: true,
                        tension: 0.3
                    }]
                }
            });

        } catch (error) {
            console.error(error);
            document.querySelector('.analytics-grid').innerHTML = '<p>Could not load analytics data.</p>';
        }
    }

    yearFilter.addEventListener('change', () => fetchAndRenderCharts(yearFilter.value));
    fetchAndRenderCharts(yearFilter.value);
});