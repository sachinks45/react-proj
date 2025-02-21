import React from 'react';

const PredictionsPanel = () => {
  const predictions = [
    { endpoint: 1, value: 0.45 },
    { endpoint: 2, value: 0.78 },
    { endpoint: 3, value: 0.23 },
    { endpoint: 4, value: 0.56 },
    { endpoint: 5, value: 0.89 },
    { endpoint: 6, value: 0.12 },
    { endpoint: 7, value: 0.34 },
    { endpoint: 8, value: 0.67 },
    { endpoint: 9, value: 0.90 },
    { endpoint: 10, value: 0.09 },
    { endpoint: 11, value: 0.45 },
    { endpoint: 12, value: 0.78 },
  ];

  return (
    <div className="left-container">
      <h3>Predicted Endpoints</h3>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((pred) => (
            <tr key={pred.endpoint}>
              <td>{pred.endpoint}</td>
              <td>{pred.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PredictionsPanel;