import { IoMdClose } from "react-icons/io";
import { Badge } from "react-bootstrap";
import { Product } from "../../../../interface/Product";
import styles from "./ProductList.module.scss";
import { memo, useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../context/auth";
import { useLocation } from "react-router-dom";
import { getModuleByMenu } from "../../../../api/module/module";
import {
  convertDateToUTCLocal,
  formatDate,
  formatter,
} from "../../../../lib/helpers/functions/functions";
import { MdOutlineRestore } from "react-icons/md";

const ProductListActive = ({
  product,
  deleteProd,
  restorePro,
  openModalRE,
  item,
}: {
  product: Product;
  deleteProd: (id: string) => void;
  restorePro: (id: string) => void;
  openModalRE: (props: boolean, value?: any) => void;
  item?: number;
}) => {
  const { mark, model, unit, area }: any = product;

  const { resources, user } = useContext(AuthContext);
  const location = useLocation();
  const getNameLocation = location.pathname.slice(1);
  const [resource, setResource] = useState<any>(null);

  const getMyModule = useCallback(async () => {
    const mymodule = await getModuleByMenu(getNameLocation);
    const findResource = resources.find(
      (res: any) => res.module.name === mymodule.data.name
    );
    setResource(findResource);
  }, [resources, getNameLocation]);

  useEffect(() => {
    getMyModule();
  }, [getMyModule]);

  return (
    <>
      {resource && resource.canUpdate ? (
        <tr>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {item}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {String(area.name)}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {String(product.cod_internal).slice(3)}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product.name}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {String(mark.name)}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {String(model.name)}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {String(unit.name)}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product.nroSerie}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product.cod_barra}
          </td>
          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product?.fecAquision
              ? convertDateToUTCLocal(new Date(String(product.fecAquision)))
              : "-"}
          </td>

          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product?.fecInicioUso
              ? convertDateToUTCLocal(new Date(String(product.fecInicioUso)))
              : "-"}
          </td>

          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product?.fecVen
              ? convertDateToUTCLocal(new Date(String(product.fecVen)))
              : "-"}
          </td>

          <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product.ubicacionLocal}-{product.areaLocal}-{product.lugarLocal}
          </td>
          {/* <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            {product.stock <= 10 ? (
              <strong style={{ color: "red" }}>{product.stock}</strong>
            ) : (
              <strong style={{ color: "green" }}>{product.stock}</strong>
            )}
          </td> */}
          {/* <td
            className={styles.table__td}
            onClick={() => openModalRE(true, product)}
          >
            S/ {formatter.format(product.price)}
          </td>
          {user.role.name === "SUPER ADMINISTRADOR" && (
            <td
              className={styles.table__td}
              onClick={() => openModalRE(true, product)}
            >
              S/{" "}
              {product.price_c === undefined
                ? "No registrado"
                : formatter.format(product.price_c)}
            </td>
          )} */}

          {/* ${styles["table--center"]} */}
          <td
            className={`${styles.table__td} `}
            onClick={() => openModalRE(true, product)}
          >
            {product.status ? (
              <Badge bg="success">Activo</Badge>
            ) : (
              <Badge bg="danger">Inactivo</Badge>
            )}
          </td>
          <td className={`${styles["table--center"]}`}>
            {product.status
              ? resource &&
                resource.canDelete && (
                  <IoMdClose
                    className={styles.table__iconClose}
                    onClick={() => deleteProd(String(product._id))}
                  />
                )
              : resource &&
                resource.canRestore && (
                  <td className={`${styles["table--center"]}`}>
                    <MdOutlineRestore
                      className={styles.table__iconRestore}
                      onClick={() => restorePro(String(product._id))}
                    />
                  </td>
                )}
          </td>
        </tr>
      ) : (
        <tr>
          <td>{item}</td>
          <td>{String(area.name)}</td>
          <td>{String(product.cod_internal).slice(3)}</td>
          <td>{product.name}</td>
          <td>{product.note}</td>
          <td>{String(mark.name)}</td>
          <td>{String(model.name)}</td>
          <td>{String(unit.name)}</td>
          {/* <td>
            {product.stock <= 10 ? (
              <strong style={{ color: "red" }}>{product.stock}</strong>
            ) : (
              <strong style={{ color: "green" }}>{product.stock}</strong>
            )}
          </td>
          <td>S/ {formatter.format(product.price)}</td>
          {user.role.name === "SUPER ADMINISTRADOR" && (
            <td>
              S/{" "}
              {product.price_c === undefined
                ? "No registrado"
                : formatter.format(product.price_c)}
            </td>
          )} */}

          <td className={`${styles.table__td} ${styles["table--center"]}`}>
            {product.status && <Badge bg="success">Activo</Badge>}
          </td>
          {resource && resource.canDelete && (
            <td className={`${styles["table--center"]}`}>
              <IoMdClose
                className={styles.table__iconClose}
                onClick={() => deleteProd(String(product._id))}
              />
            </td>
          )}
        </tr>
      )}
    </>
  );
};

export default memo(ProductListActive);
