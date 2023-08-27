import { Badge } from "react-bootstrap";
import { Product } from "../../../../interface/Product";
import { convertDateToUTCLocal } from "../../../../lib/helpers/functions/functions";
import { differenceInDays } from "date-fns";

const ConsultProductList = ({
  product,
  item,
}: {
  product: Product;
  item: number;
}) => {
  const { unit, area, mark, model }: any = product;
  console.log(product);
  return (
    <>
      <tr>
        <td>{item + 1}</td>
        <td>{String(area.name)}</td>
        <td>{String(product.cod_internal).slice(3)}</td>
        <td>{product.name}</td>
        <td>{String(mark.name)}</td>
        <td>{String(model.name)}</td>
        <td>{String(unit.name)}</td>
        <td>{product.nroSerie}</td>
        <td>{product.cod_barra}</td>
        <td>
          {product?.fecAquision
            ? convertDateToUTCLocal(new Date(String(product?.fecAquision)))
            : "-"}
        </td>
        <td>
          {product?.fecInicioUso
            ? convertDateToUTCLocal(new Date(String(product?.fecInicioUso)))
            : "-"}
        </td>
        <td>
          {product?.fecVen ? (
            differenceInDays(new Date(String(product?.fecVen)), new Date()) >=
              0 &&
            differenceInDays(new Date(String(product?.fecVen)), new Date()) <
              7 ? (
              <Badge bg="warning">Por vencer</Badge>
            ) : differenceInDays(
                new Date(String(product?.fecVen)),
                new Date()
              ) > 6 ? (
              <Badge bg="success">Habilitado</Badge>
            ) : (
              <Badge bg="danger">Vencido</Badge>
            )
          ) : (
            <Badge bg="info">Sin fecha</Badge>
          )}
        </td>
        <td>
          {product.ubicacionLocal}-{product.areaLocal}-{product.lugarLocal}
        </td>
        {/* <td>{product.stock}</td>
        <td>S/ {product.price}</td> */}
        <td>
          {product.status ? (
            <Badge bg="success">Activo</Badge>
          ) : (
            <Badge bg="danger">Inactivo</Badge>
          )}
        </td>
      </tr>
    </>
  );
};

export default ConsultProductList;
