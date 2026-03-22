import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// 1. I-register ang mga kailangang modules mula sa Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function WebMiniChart({ history }) {
  // 2. Verification: Siguraduhing may data bago i-render
  if (!history || !history.labels || !history.inflow || !history.filter) {
    return <div style={{color: '#64748b', textAlign: 'center', paddingTop: '100px', fontSize: '12px'}}>Waiting for Trend Data...</div>;
  }

  // 3. I-configure ang DATA gaya ng nasa mobile app (Inflow at Filter lines)
  const data = {
    labels: history.labels, // ["10:30", "10:45", "11:00", ...]
    datasets: [
      {
        label: 'INFLOW RATE (L/m)',
        data: history.inflow,
        borderColor: '#3b82f6', // Neon Blue (Mobile Color)
        backgroundColor: '#3b82f6',
        borderWidth: 2.5,
        tension: 0.4, // Ito ang gumagawa ng sleek curves gaya ng sa mobile
        pointRadius: 3, // Maliit na points gaya ng sa mobile
        pointHoverRadius: 6,
        fill: false, // Huwag lagyan ng kulay sa ilalim (sleek line lang)
      },
      {
        label: 'FILTER RATE (L/m)',
        data: history.filter,
        borderColor: '#7dd3fc', // Teal/Light Blue (Mobile Color)
        backgroundColor: '#7dd3fc',
        borderWidth: 2.5,
        tension: 0.4, // Sleek curves
        pointRadius: 3, // Maliit na points
        pointHoverRadius: 6,
        fill: false,
      },
    ],
  };

  // 4. I-configure ang OPTIONS para makuha ang "Gizmo" at Dark Style look
  const options = {
    responsive: true,
    maintainAspectRatio: false, // Para mag-adjust sa container size
    plugins: {
      legend: {
        position: 'top',
        align: 'end', // I-align sa top-right gaya ng mobile app
        labels: {
          color: '#fff', // White text para sa labels
          font: {
            size: 10,
            family: "'Inter', sans-serif",
            weight: 'bold'
          },
          usePointStyle: true, // Gamitin ang tuldok imbes na box gaya ng mobile
          pointStyle: 'circle',
          boxWidth: 6,
          boxHeight: 6
        }
      },
      tooltip: {
        backgroundColor: 'rgba(13, 31, 60, 0.9)', // Dark tooltip
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#1e3a5f',
        borderWidth: 1,
        cornerRadius: 10,
        font: { family: "'Inter', sans-serif" }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10, // I-set ang max base sa iyong simulator range (0.5 to 7.5)
        grid: {
          color: 'rgba(30, 58, 95, 0.2)', // Subtler grid lines
          borderDash: [5, 5] // Dashed lines gaya ng sa mobile screenshot
        },
        ticks: {
          color: '#94a3b8', // Kulay ng ticks
          font: { size: 10 },
          stepSize: 2,
          callback: function(value) { return value + ' L/m'; } // Dagdagan ng unit L/m
        }
      },
      x: {
        grid: {
          color: 'rgba(30, 58, 95, 0.2)',
          borderDash: [5, 5] // Dashed lines
        },
        ticks: {
          color: '#94a3b8', // Kulay ng ticks
          font: { size: 10 },
          maxRotation: 0,
          minRotation: 0
        }
          }
        }
      };

  return <Line data={data} options={options} />;
}