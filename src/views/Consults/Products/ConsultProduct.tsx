import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Card, Table, Form, Row, Col, Button } from "react-bootstrap";
import TableHeader from "../../../components/DatatableComponent/Header/TableHeader";
import { Product } from "../../../interface/Product";
import ConsultProductList from "../../../components/ConsultComponent/Product/List/ConsultProductList";
import PaginationComponent from "../../../components/DatatableComponent/Pagination/Pagination";
import { getProducts } from "../../../api/product/product";
import useResource from "../../../hooks/resource/resourceHook";
import { IAlert } from "../../../interface/IAlert";
import { differenceInDays } from "date-fns";
import { CSVLink } from "react-csv";
import { formatFech } from "../../../lib/helpers/functions/functions";
import { getAreas } from "../../../api/area/area";
import { Area } from "../../../interface/Area";
import { AuthContext } from "../../../context/auth";
import { Controller, useForm } from "react-hook-form";
import { getModels } from "../../../api/model/model";
import { getMarks } from "../../../api/mark/mark";
import { Mark } from "../../../interface/Mark";
import { Model } from "../../../interface/Model";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { AnyAaaaRecord } from "dns";

const animatedComponents = makeAnimated();

const headers = [
  { name: "#", field: "item", sortable: false },
  { name: "Sede", field: "area", sortable: true },
  { name: "Cod. Interno", field: "cod_internal", sortable: true },
  { name: "Producto", field: "name", sortable: true },
  { name: "Marca", field: "mark", sortable: true },
  { name: "Modelo", field: "model", sortable: true },
  { name: "Uni. Medida", field: "unit", sortable: true },
  { name: "Nro. Serie", field: "nroSerie", sortable: true },
  { name: "Cod. Barra", field: "cod_barra", sortable: true },
  { name: "Fec. Adquisicion", field: "fecAquision", sortable: true },
  { name: "Fec. inicio/uso", field: "fecInicioUso", sortable: true },
  { name: "Fec. Vencimiento", field: "fecVen", sortable: true },
  { name: "Ubicación", field: "ubi", sortable: false },

  // { name: "Stock", field: "stock", sortable: true },
  // { name: "Precio Venta", field: "price", sortable: true },
  // { name: "Precio Costo", field: "price_c", sortable: true },
  { name: "Estado", field: "status", sortable: false },
];

const initialStateAlert: IAlert = {
  type: "",
  message: "",
};

const ConsultProductScreen = () => {
  const [sorting, setSorting] = useState({ field: "", order: "" });
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [consult, setConsult] = useState({
    filter: true,
    habs: { state: false, name: "" },
    venc: { state: false, name: "" },
    xvenc: { state: false, name: "" },
    nofec: { state: false, name: "" },
    filterRange: false,
    start: "",
    end: "",
  });
  const [showRange, setShowRange] = useState(false);
  const ITEMS_PER_PAGE = 50;
  const [resource] = useResource();
  const [message, setMessage] = useState<IAlert>(initialStateAlert);
  const [cantProducts, setCantProduct] = useState(0);
  const [exportXML, setExportXML] = useState<any[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const { user } = useContext(AuthContext);

  const listAreas = useCallback(async () => {
    const res = await getAreas();
    const filter = res.data.map((area: any) => {
      return {
        _id: area._id,
        name: area.name,
        checked: area.name === user.area.name ? true : false,
      };
    });
    setAreas(filter);
  }, [user]);

  const onSorting = (field: string, order: string) =>
    setSorting({ field, order });

  const handleChange = (e: any) => {
    setCurrentPage(1);
    setMessage(initialStateAlert);
    setConsult({ ...consult, [e.target.name]: e.target.checked });
  };

  const listProduct = async () => {
    const res = await getProducts();
    const map = res.data.map((format: any) => {
      return {
        ...format,
        fecVen: format?.fecVen ? format?.fecVen : NaN,
        stateProd: format.fecVen
          ? differenceInDays(new Date(String(format?.fecVen)), new Date()) >=
              0 &&
            differenceInDays(new Date(String(format?.fecVen)), new Date()) < 7
            ? "Por vencer"
            : differenceInDays(new Date(String(format?.fecVen)), new Date()) > 6
            ? "Activo"
            : "Vencido"
          : "Sin fecha",
        daysVen: differenceInDays(new Date(String(format?.fecVen)), new Date()),
      };
    });

    setProducts(map);
  };

  const { watch, control } = useForm<any>({
    defaultValues: {
      area: "TODOS",
      status: "activo",
      producto: "",
      marca: { label: "TODOS", value: "TODOS" },
      modelo: { label: "TODOS", value: "TODOS" },
    },
  });

  const area = watch("area");
  const estado = watch("status");
  const productoInput = watch("producto");
  const marcaSelect = watch("marca");
  const modeloSelect = watch("modelo");
  console.log(watch());
  const productsFiltered = useMemo(() => {
    // if (resource.canRead)
    //   return computedProducts.slice(
    //     (currentPage - 1) * ITEMS_PER_PAGE,
    //     (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
    //   );
    // else return [];
    let computedProducts: any[] = products;
    if (area === "TODOS") {
      if (marcaSelect.value === "TODOS" && modeloSelect.value === "TODOS") {
        // eslint-disable-next-line no-self-assign
        computedProducts = computedProducts;
      } else {
        computedProducts = computedProducts.filter((a) => {
          console.log(a.model.name, modeloSelect.value);
          return (
            a.mark.name === marcaSelect.value &&
            a.model.name === modeloSelect.value
          );
        });
      }
    } else {
      computedProducts = computedProducts.filter((a) => {
        return (
          a.area.name === area &&
          (estado === "activo"
            ? a.status === true && a.area.name === area
            : a.status === false && a.area.name === area) &&
          a.mark.name === marcaSelect.value &&
          a.model.name === modeloSelect.value
        );
      });
    }

    if (productoInput) {
      computedProducts = computedProducts.filter((a) => {
        return (
          a.name.toLowerCase().includes(productoInput.toLowerCase()) ||
          a.cod_internal.toLowerCase().includes(productoInput.toLowerCase()) ||
          a.cod_barra.toLowerCase().includes(productoInput.toLowerCase()) ||
          a.nroSerie.toLowerCase().includes(productoInput.toLowerCase())
        );
      });
    }

    if (sorting.field) {
      const reversed = sorting.order === "asc" ? 1 : -1;
      computedProducts = computedProducts.sort((a: any, b: any) => {
        if (typeof a[sorting.field] === "object") {
          return (
            reversed *
            a[sorting.field].name
              .toString()
              .localeCompare(b[sorting.field].name.toString())
          );
        } else {
          if (typeof a[sorting.field] === "number") {
            return reversed * (a[sorting.field] - b[sorting.field]);
          } else {
            return (
              reversed *
              a[sorting.field]
                .toString()
                .localeCompare(b[sorting.field].toString())
            );
          }
        }
      });
    }

    setExportXML(computedProducts);
    return computedProducts;

    //setTotalItems(computedProducts.length);

    //Sorting comments

    // setCantProduct(computedProducts.length);
    // setExportXML(computedProducts);
  }, [
    products,
    area,
    productoInput,
    sorting.field,
    sorting.order,
    marcaSelect.value,
    modeloSelect.value,
    estado,
  ]);

  const onPageChange = (page: number) => setCurrentPage(page);
  const [marks, setMarks] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  const listMarks = async () => {
    const res = await getMarks();
    const { data } = res;
    const marks = data.map((mod: any) => {
      return {
        label: mod.name,
        value: mod.name,
      };
    });
    setMarks([{ label: "TODOS", value: "TODOS" }, ...marks]);
  };

  const listModels = async () => {
    const res = await getModels();
    const { data } = res;
    const models: any[] = data.map((mod: any) => {
      return {
        label: mod.name,
        value: mod.name,
      };
    });

    setModels([{ label: "TODOS", value: "TODOS" }, ...models]);
  };

  useEffect(() => {
    listAreas();
    listProduct();
    listMarks();
    listModels();
  }, [resource.canRead, listAreas]);

  const goSearch = () => setConsult({ ...consult, filterRange: true });

  const headerXML = headers.map((head) => {
    return {
      label: head.name,
      key: head.field,
    };
  });

  const dataXML = exportXML.map((product: any, i: number) => {
    return {
      ...product,
      area: product.area.name,
      mark: product.mark.name,
      model: product.model.name,
      cod_internal: product.cod_internal.slice(3),
      ubi: `${product.ubicacionLocal}-${product.areaLocal}-${product.lugarLocal}`,
      fecVen: product.fecVen
        ? formatFech(new Date(String(product.fecVen)))
        : "-",
      unit: product.unit.name,
      daysVen: product.daysVen ? product.daysVen : "-",
      item: i + 1,
    };
  });

  return (
    <Card>
      <Card.Header as="h5">Consulta de productos</Card.Header>
      <Card.Body>
        {message.type && (
          <Alert variant={message.type}>{message.message}</Alert>
        )}

        <Row className="mb-3">
          <Form.Group sm={3} as={Col} controlId="formGridSede">
            <Form.Label>Sede</Form.Label>
            <Controller
              control={control}
              name="area"
              render={({ field: { onChange, ref, onBlur, value } }) => {
                return (
                  <Form.Select
                    onChange={onChange}
                    ref={ref}
                    onBlur={onBlur}
                    value={String(value)}
                  >
                    <option value="TODOS">TODOS</option>
                    {areas.map((area) => (
                      <option key={area._id} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </Form.Select>
                );
              }}
            />
          </Form.Group>
          <Form.Group sm={3} as={Col} controlId="formGridSede">
            <Form.Label>Marca</Form.Label>
            <Controller
              control={control}
              name="marca"
              render={({ field: { onChange, ref, onBlur, value } }) => {
                return (
                  <Select
                    placeholder="[Seleccione marca]"
                    closeMenuOnSelect={true}
                    components={animatedComponents}
                    ref={ref}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    options={marks}
                  />
                );
              }}
            />
          </Form.Group>
          <Form.Group sm={3} as={Col} controlId="formGridSede">
            <Form.Label>Modelo</Form.Label>
            <Controller
              control={control}
              name="modelo"
              render={({ field: { onChange, ref, onBlur, value } }) => {
                return (
                  <Select
                    placeholder="[Seleccione modelo]"
                    closeMenuOnSelect={true}
                    components={animatedComponents}
                    ref={ref}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    options={models}
                  />
                );
              }}
            />
          </Form.Group>
        </Row>
        {area === "TODOS" || (
          <>
            <Row className="mb-3">
              <Form.Group sm={3} as={Col} controlId="formGridEst">
                <Form.Label>Estado</Form.Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field: { onChange, ref, onBlur, value } }) => {
                    return (
                      <Form.Select
                        onChange={onChange}
                        ref={ref}
                        onBlur={onBlur}
                        value={String(value)}
                      >
                        <option value="activo">Activos</option>
                        <option value="inactivo">Inactivos</option>
                      </Form.Select>
                    );
                  }}
                />
              </Form.Group>
            </Row>
          </>
        )}

        {/* <Row className="d-flex justify-content-end" style={{}}>
          <Col sm={3}>
            <Button
              onClick={onClickConsultar}
              style={{ width: "100%" }}
              variant="primary"
            >
              Consultar
            </Button>
          </Col>
        </Row> */}

        {/* {showRange && (
          <Row className="mb-3">
            <Form.Group md="3" as={Col} controlId="formGridStart">
              <Form.Label>
                Consultar productos x fecha de vencimiento desde:
              </Form.Label>
              <Form.Control
                name="start"
                type="date"
                onChange={(e) => {
                  setConsult({
                    ...consult,
                    start: e.target.value,
                  });
                }}
              />
            </Form.Group>
            <Form.Group md="3" as={Col} controlId="formGridEnd">
              <Form.Label>
                Consultar productos x fecha de vencimiento hasta:
              </Form.Label>
              <Form.Control
                name="end"
                type="date"
                onChange={(e) => {
                  setConsult({
                    ...consult,
                    end: e.target.value,
                  });
                }}
              />
            </Form.Group>
            <Form.Group md="4" as={Col} controlId="formGridFech">
              <Form.Label>Buscar</Form.Label>
              <Button
                type="button"
                variant="primary"
                className="w-100"
                onClick={goSearch}
              >
                Consultar
              </Button>
            </Form.Group>
          </Row>
        )}
        <Row className="mb-3">
          <Form.Group md="4" as={Col} controlId="formBasicCheckbox">
            <label
              style={{ cursor: "pointer" }}
              className="text-primary"
              onClick={() => {
                if (showRange !== false) {
                  setConsult({
                    ...consult,
                    filterRange: false,
                    start: "",
                    end: "",
                  });
                  setShowRange(!showRange);
                } else {
                  setShowRange(!showRange);
                }
              }}
            >
              {showRange
                ? "Ocultar y resetear consulta por rango de fecha de vencimiento"
                : "Mostrar consulta por rango de fecha de vencimiento"}
            </label>
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group md="4" as={Col} controlId="formBasicCheckbox">
            <Form.Check
              type="checkbox"
              label="Buscar productos agotados"
              name="filter"
              onChange={handleChange}
              checked={consult.filter}
            />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group md="4" as={Col} controlId="formCheckboxHab">
            <Form.Check
              type="checkbox"
              label="Buscar productos activos"
              name="habs"
              onChange={(e) => {
                setCurrentPage(1);
                setConsult({
                  ...consult,
                  habs: {
                    name: e.target.checked ? "Habilitado" : "",
                    state: e.target.checked,
                  },
                });
              }}
              checked={consult.habs.state}
            />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group md="4" as={Col} controlId="formCheckboxVen">
            <Form.Check
              type="checkbox"
              label="Buscar productos vencidos"
              name="venc"
              onChange={(e) => {
                setCurrentPage(1);
                setConsult({
                  ...consult,
                  venc: {
                    name: e.target.checked ? "Vencido" : "",
                    state: e.target.checked,
                  },
                });
              }}
              checked={consult.venc.state}
            />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group md="4" as={Col} controlId="formCheckboxXVen">
            <Form.Check
              type="checkbox"
              label="Buscar productos por vencer"
              name="xvenc"
              onChange={(e) => {
                setCurrentPage(1);
                setConsult({
                  ...consult,
                  xvenc: {
                    name: e.target.checked ? "Por vencer" : "",
                    state: e.target.checked,
                  },
                });
              }}
              checked={consult.xvenc.state}
            />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group md="4" as={Col} controlId="formCheckboxSFec">
            <Form.Check
              type="checkbox"
              label="Buscar productos sin fecha de vencimiento"
              name="nofec"
              onChange={(e) => {
                setCurrentPage(1);
                setConsult({
                  ...consult,
                  nofec: {
                    name: e.target.checked ? "Sin fecha" : "",
                    state: e.target.checked,
                  },
                });
              }}
              checked={consult.nofec.state}
            />
          </Form.Group>
        </Row> */}
        <Alert variant={"info"}>
          Puedes buscar producto por nombre, código interno, código de barra o
          nro de serie.
        </Alert>
        <Row className="mb-3">
          <Form.Group sm={3} as={Col} controlId="formGridPro">
            <Form.Label>Buscar producto</Form.Label>
            <Controller
              control={control}
              name="producto"
              render={({ field: { onChange, ref, onBlur, value } }) => {
                return (
                  <Form.Control
                    onChange={onChange}
                    ref={ref}
                    value={value}
                    type="text"
                    placeholder="Introduce un valor"
                    onBlur={onBlur}
                  />
                );
              }}
            />
          </Form.Group>
        </Row>
        <div
          className="mb-3"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <PaginationComponent
            total={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={onPageChange}
          />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span style={{ marginLeft: 5 }}>
              Se encontraron un total de {productsFiltered.length} registros
            </span>
          </div>
        </div>
        {resource.canRead && (
          <>
            <Form.Group
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
              //className={styles.contentButtons__excel__input}
            >
              <CSVLink
                data={dataXML}
                headers={headerXML}
                filename={`reporte_${new Date().getTime()}.csv`}
                target="_blank"
                separator={";"}
              >
                <Form.Label
                  className="btn btn-success"
                  style={{ cursor: "pointer" }}
                >
                  Exportar a excel
                </Form.Label>
              </CSVLink>
            </Form.Group>
            <Table striped bordered hover responsive size="sm">
              <TableHeader headers={headers} onSorting={onSorting} />
              <tbody>
                {productsFiltered.map((product: any, i: number) => (
                  <ConsultProductList
                    key={product._id}
                    item={i}
                    product={product}
                  />
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ConsultProductScreen;
