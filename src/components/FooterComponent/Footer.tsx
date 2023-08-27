import styles from "./Footer.module.scss";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footer__copyright}>
        © 2023 by Kemay Technology. Todos los derechos reservados. Version:
        1.0.0 | Powered by{" "}
        <a href="https://davisperezg.com/" rel="noreferrer" target="_blank">
          @davisperezg
        </a>
      </div>
    </footer>
  );
};

export default Footer;
