import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from "react-native-chart-kit";

export default function MobileMiniChart({ history }) {
  // 1. Check kung may data na galing sa API
  if (!history || !history.labels || history.labels.length === 0) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#475569', fontSize: 12 }}>Waiting for Trend Data...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;

  // 2. I-prepare ang data (Inflow at Filter)
  const chartData = {
    labels: history.labels, // ["10:00", "11:00", ...]
    datasets: [
      {
        data: history.inflow,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Neon Blue
        strokeWidth: 3 
      },
      {
        data: history.filter,
        color: (opacity = 1) => `rgba(125, 211, 252, ${opacity})`, // Light Teal
        strokeWidth: 3
      }
    ],
    legend: ["INFLOW", "FILTER"] // Lalabas sa taas gaya ng website
  };

  // 3. Chart Configuration (The "Gizmo" Look)
  const chartConfig = {
    backgroundColor: "#0d1f3c",
    backgroundGradientFrom: "#0d1f3c",
    backgroundGradientTo: "#0d1f3c",
    decimalPlaces: 1, 
    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`, // Grid & Text color
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#060e1a"
    },
    propsForBackgroundLines: {
      strokeDasharray: "5, 5", // Dashed lines gaya ng sa website
      stroke: "rgba(30, 58, 95, 0.3)"
    }
  };

  return (
    <View style={{ marginVertical: 10, alignItems: 'center' }}>
      <LineChart
        data={chartData}
        width={screenWidth - 40} // Sakto sa padding ng screen
        height={220}
        chartConfig={chartConfig}
        bezier // Ito ang sikreto para maging "Curved" ang lines gaya ng website
        style={{
          marginVertical: 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1e3a5f'
        }}
        fromZero={true}
        yAxisSuffix=" L/m"
        verticalLabelRotation={0}
      />
    </View>
  );
}