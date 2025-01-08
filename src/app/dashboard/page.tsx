export default function Dashboard() {
    return (
      <div style={styles.container}>
        <h1>Welcome to the Dashboard</h1>
        <p>Your wallet has been successfully authenticated!</p>
      </div>
    );
  }
  
  const styles = {
    container: {
      fontFamily: "'Arial', sans-serif",
      textAlign: "center" as const,
      marginTop: "20%",
    },
  };
  