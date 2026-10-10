document.addEventListener('DOMContentLoaded', () => {

    const form =
        document.getElementById('irrigation-form');

    const result =
        document.getElementById('irrigation-result');

    const status =
        document.getElementById('irrigation-status');

    const message =
        document.getElementById('irrigation-message');

    const statusIcon =
        document.getElementById('result-status-icon');

    const resultCrop =
        document.getElementById('result-crop');

    const resultMoisture =
        document.getElementById('result-moisture');

    const resultThreshold =
        document.getElementById('result-threshold');

    const button =
        document.getElementById('irrigation-check-btn');


    form.addEventListener('submit', async (event) => {

    event.preventDefault();

    const crop =
        document.getElementById('irrigation-crop').value;

    const moistureInput =
        document.getElementById('soil-moisture');

    let moisture = null;


    // ==========================================
    // VALIDATE CROP
    // ==========================================

    if (!crop) {
        alert('Please select a crop.');
        return;
    }


    button.disabled = true;

    button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Checking...';


    try {

        // ==========================================
        // FIRST PRIORITY: LIVE SENSOR
        // ==========================================

        try {

            const sensorResponse =
                await fetch('/api/sensor/data');

            const sensorData =
                await sensorResponse.json();

            if (
                sensorResponse.ok &&
                sensorData.success &&
                sensorData.available &&
                sensorData.data &&
                sensorData.data.moisture !== undefined
            ) {

                moisture =
                    Number(sensorData.data.moisture);

                // Show live sensor moisture in the input field
                if (moistureInput) {
                    moistureInput.value = moisture;
                }

                console.log(
                    'Live sensor moisture loaded:',
                    moisture
                );

            } else {

                console.log(
                    'Live moisture sensor unavailable. Using manual moisture.'
                );
            }

        } catch (sensorError) {

            console.warn(
                'Sensor unavailable. Using manual moisture.',
                sensorError
            );
        }


        // ==========================================
        // FALLBACK: MANUAL MOISTURE
        // ==========================================

        if (
            moisture === null ||
            Number.isNaN(moisture)
        ) {

            moisture =
                Number(moistureInput.value);

            if (Number.isNaN(moisture)) {

                alert(
                    'Live moisture sensor is unavailable. Please enter soil moisture manually.'
                );

                return;
            }

            console.log(
                'Manual moisture used:',
                moisture
            );
        }


        // ==========================================
        // SEND IRRIGATION REQUEST
        // ==========================================

        const response =
            await fetch('/api/irrigation/check', {

                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    crop: crop,

                    moisture: moisture

                })

            });


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                'Unable to check irrigation.'
            );
        }


        // ==========================================
        // DISPLAY RESULT
        // ==========================================

        result.style.display = 'block';


        resultCrop.textContent =
        data.crop
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());


        resultMoisture.textContent =
            data.soilMoisture;


        resultThreshold.textContent =
            data.threshold;


        message.textContent =
            data.message;


        // ==========================================
        // STATUS
        // ==========================================

        if (data.irrigationRequired) {

            status.textContent =
                'Irrigation Required';

            statusIcon.innerHTML =
                '<i class="fas fa-tint"></i>';

            statusIcon.classList.add(
                'irrigation-required'
            );

            statusIcon.classList.remove(
                'irrigation-not-required'
            );

        } else {

            status.textContent =
                'Irrigation Not Required';

            statusIcon.innerHTML =
                '<i class="fas fa-check-circle"></i>';

            statusIcon.classList.add(
                'irrigation-not-required'
            );

            statusIcon.classList.remove(
                'irrigation-required'
            );

        }


        // ==========================================
        // SCROLL TO RESULT
        // ==========================================

        result.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });


    } catch (error) {

        alert(error.message);

    } finally {

        button.disabled = false;

        button.innerHTML =
            '<i class="fas fa-search"></i> Check Irrigation';

    }

});
});