import Image from "next/image";

export default function LandingPage(){
  return(
    <div style={styles.container}>
      {/* Header Section */}
      <header style={styles.header}>
        <h1 style={styles.logo}>
          <Image
            src="/carbon-credits-logo.png"
            alt=""
            width={40}
            height={40}
            style={styles.logoImage}
          />
          Carbon Credits
        </h1>
        <button style={styles.button}>Authentication</button>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <h2 style={styles.heading}>Future’s Unified ITMOs Trading Exchange</h2>

        <section style={styles.section}>
          <h3 style={styles.subheading}>We are currently</h3>
          <p style={styles.text}>
            Building a Decentralised ITMOs Trading Platform using XRPL and EVM
            Sidechain to ensure Transparency, Compliance and Efficiency for
            UNFCCC regulated carbon market.
          </p>
        </section>

        <section style={styles.section}>
          <h3 style={styles.subheading}>Why? Because</h3>
          <p style={styles.text}>
            the Current ITMOs Market Suffers from Inefficiencies, Limited
            Transparency and inadequate compliance mechanism, hindering the
            UNFCCC’s ability to effectively regulate and enforce global carbon
            reduction standards.
          </p>
        </section>
      </main>

      {/* Globe Image */}
      <div style={styles.globeContainer}>
        <Image
          src="/globe-image.png"
          alt="Globe"
          width={300}
          height={300}
          style={styles.globeImage}
        />
      </div>
    </div>
  );
}
const styles: any = {
  container: {
    fontFamily: "'Arial', sans-serif",
    background: "linear-gradient(to bottom, #2b3f5c, #133045)",
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: 0,
    display: "flex",
    alignItems: "center",
  },
  logoImage: {
    height: "40px",
    marginRight: "10px",
  },
  button: {
    background: "#ff9800",
    border: "none",
    borderRadius: "20px",
    padding: "0.5rem 1rem",
    color: "#fff",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  main: {
    flex: "1",
    maxWidth: "800px",
    margin: "3rem auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  section: {
    marginTop: "2rem",
    textAlign: "left" as const,
  },
  heading: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "2rem",
    textAlign: "center" as const,
  },
  subheading: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
  },
  text: {
    fontSize: "1rem",
    lineHeight: "1.5",
  },
  globeContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "2rem",
  },
  globeImage: {
    width: "300px",
    borderRadius: "50%",
  },
};
