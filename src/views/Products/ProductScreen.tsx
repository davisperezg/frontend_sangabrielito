/* eslint-disable array-callback-return */
import {
  useCallback,
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Alert, Button, Card, Table, Form } from "react-bootstrap";
import { Product } from "../../interface/Product";
import {
  deleteProduct,
  getProductDeleted,
  getProducts,
  restoreProduct,
} from "../../api/product/product";
import styles from "./Product.module.scss";
import ProductForm from "../../components/ProductComponent/Form/ProductForm";
import ProductListRemoves from "../../components/ProductComponent/List/Removes/ProductListRemoves";
import ProductListActive from "../../components/ProductComponent/List/Activos/ProductList";
import { AuthContext } from "../../context/auth";
import { useLocation } from "react-router-dom";
import { getModuleByMenu } from "../../api/module/module";
import { IAlert } from "../../interface/IAlert";
import XLSX from "xlsx";
import { postCreateProduct } from "../../api/product/product";
import PaginationComponent from "../../components/DatatableComponent/Pagination/Pagination";
import Search from "../../components/DatatableComponent/Search/Search";
import TableHeader from "../../components/DatatableComponent/Header/TableHeader";
import { CSVLink } from "react-csv";
import { convertDateToUTCLocal } from "../../lib/helpers/functions/functions";

const initialState: IAlert = {
  type: "",
  message: "",
};

const EXTENSIONS = ["xlsx", "xls", "csv"];

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
  { name: "Fec. Inicio", field: "fecInicioUso", sortable: true },
  { name: "Fec. Vencimiento", field: "fecVen", sortable: true },
  { name: "Ubicación", field: "ubi", sortable: false },

  // { name: "Stock", field: "stock", sortable: true },
  // { name: "Precio Venta", field: "price", sortable: true },
  // { name: "Precio Costo", field: "price_c", sortable: true },
  { name: "Estado", field: "status", sortable: false },
  { name: "", field: "delete", sortable: false },
];

const headersFormat = [
  { label: "name", key: "name" },
  { label: "cod_internal", key: "cod_internal" },
  { label: "mark", key: "mark" },
  { label: "model", key: "model" },
  { label: "unit", key: "unit" },
  { label: "stock", key: "stock" },
  { label: "price", key: "price" },
  { label: "price_c", key: "price_c" },
  { label: "area", key: "area" },
];

const dataFormat = [
  {
    name: "PRUEBA",
    cod_internal: "CODAVETEST",
    mark: "NINGUNA",
    model: "NINGUNA",
    unit: "UNIDAD",
    stock: "10",
    price: 12,
    price_c: 10,
    area: "SANTA ROSA",
  },
];

const ProductScreen = () => {
  const [show, setShow] = useState(false);
  const [state, setState] = useState<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [registers, setRegisters] = useState<Product[]>([]);
  const [removes, setRemoves] = useState<Product[]>([]);
  const { resources, user } = useContext(AuthContext);
  const [resource, setResource] = useState<any>(null);
  const location = useLocation();
  const getNameLocation = location.pathname.slice(1);
  const [message, setMessage] = useState<IAlert | any>(initialState);
  const [message2, setMessage2] = useState<IAlert | any>(initialState);
  const [message3, setMessage3] = useState<IAlert | any>(initialState);
  const [showAlert1, setShowAlert1] = useState(false);
  const [showAlert2, setShowAlert2] = useState(false);
  const [showAlert3, setShowAlert3] = useState(false);
  const [file, setFile] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const [sorting, setSorting] = useState({ field: "", order: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const getMyModule = useCallback(async () => {
    const mymodule = await getModuleByMenu(getNameLocation);
    const findResource = resources.find(
      (res: any) => res.module.name === mymodule.data.name
    );
    setResource(findResource);
  }, [resources, getNameLocation]);

  const openModalRE = useCallback((props: boolean, value?: any) => {
    setShow(true);
    if (props) {
      setState({
        ...value,
        mark: value.mark.name,
        model: value.model.name,
        unit: value.unit.name,
      });
    }
  }, []);

  const closeModal = useCallback(() => {
    setShow(false);
    setState({});
  }, []);

  const listProducts = useCallback(async () => {
    const res = await getProducts();
    const { data } = res;
    setProducts(data);
  }, []);

  const listProductDeleted = useCallback(async () => {
    const res = await getProductDeleted();
    const { data } = res;
    setRemoves(data);
  }, []);

  const _deleteProduct = useCallback(
    async (id: string) => {
      if (resource && resource.canDelete === false) {
        setMessage({
          type: "danger",
          message: "No tienes acceso a este recurso.",
        });
        return;
      }
      const __deletedProduct = await deleteProduct(id);
      const { data } = __deletedProduct;
      const { productDeleted } = data;
      if (productDeleted) {
        listProducts();
        listProductDeleted();
      }
    },
    [listProducts, listProductDeleted, resource]
  );

  const _restoreProduct = useCallback(
    async (id: string) => {
      if (resource && resource.canRestore === false) {
        setMessage({
          type: "danger",
          message: "No tienes acceso a este recurso.",
        });
        return;
      }
      const __restoreProduct = await restoreProduct(id);
      const { data } = __restoreProduct;
      const { productRestored } = data;
      if (productRestored) {
        listProducts();
        listProductDeleted();
      }
    },
    [listProducts, listProductDeleted, resource]
  );

  useEffect(() => {
    if (resource && resource.canRead) {
      listProducts();
    }

    listProductDeleted();
    getMyModule();
  }, [listProducts, listProductDeleted, getMyModule, resource]);

  const importExcel = (e: any) => {
    setMessage(initialState);
    setMessage2(initialState);
    setMessage3(initialState);
    const file = e.target.files[0];
    setFile(e.target.value);
    const reader = new FileReader();
    reader.onload = (event: any) => {
      //parse data

      const bstr = event.target.result;
      const workBook = XLSX.read(bstr, { type: "binary" });

      //get first sheet
      const workSheetName = workBook.SheetNames[0];
      const workSheet = workBook.Sheets[workSheetName];
      //convert to array
      const fileData = XLSX.utils.sheet_to_json(workSheet, { header: 1 });
      // console.log(fileData)
      const headers: any = fileData[0];
      //setColDefs(heads)

      //removing header
      fileData.splice(0, 1);
      setRegisters(convertToJson(headers, fileData));
    };

    if (file) {
      if (getExention(file)) {
        reader.readAsBinaryString(file);
      } else {
        alert("Invalid file input, Select Excel, CSV file");
      }
    } else {
      setRegisters([]);
    }
  };

  const getExention = (file: any) => {
    const parts = file.name.split(".");
    const extension = parts[parts.length - 1];
    return EXTENSIONS.includes(extension); // return boolean
  };

  const convertToJson = (headers: any, data: any) => {
    let rows: any = [];
    data.forEach((row: any) => {
      let rowData: any = {};
      row.forEach((element: any, index: any) => {
        rowData[headers[index]] = element;
      });
      rows.push(rowData);
    });

    rows = rows.map((format: any) => {
      return {
        ...format,
        stock: Number(format.stock),
        price: Number(format.price),
      };
    });

    return rows;
  };

  const cancelXML = () => {
    setShowAlert2(false);
    setMessage2(initialState);
    setMessage(initialState);
    setShowAlert1(false);
    setRegisters([]);
    setFile("");
  };

  const clearAlert3 = () => {
    setMessage3(initialState);
    setShowAlert3(false);
  };

  const clearAlert2 = () => {
    setMessage2(initialState);
    setShowAlert2(false);
  };

  const clearAlert1 = () => {
    setMessage(initialState);
    setShowAlert1(false);
  };

  const onSorting = (field: string, order: string) =>
    setSorting({ field, order });

  const onPageChange = (page: number) => setCurrentPage(page);

  const productsFiltered = useMemo(() => {
    let computedProducts = products! || [];

    if (search) {
      computedProducts = computedProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.cod_internal.toLowerCase().includes(search.toLowerCase())
      );
    }

    setTotalItems(computedProducts.length);

    //Sorting comments
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
          return (
            reversed *
            a[sorting.field]
              .toString()
              .localeCompare(b[sorting.field].toString())
          );
        }
      });
    }

    //Current Page slice
    return computedProducts.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
    );
  }, [products, currentPage, sorting, search]);

  const onSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  //mejorar
  let formatExportProducts: any[] = [];
  headers.map((head, i) => {
    if (i < headers.length - 1) {
      const data = {
        label: head.name,
        key: head.field,
      };
      formatExportProducts.push(data);
    }
  });

  const dataExportProducts = products.map((product: any, i: number) => {
    return {
      ...product,
      item: i + 1,
      cod_internal: product.cod_internal.slice(3),
      ubi: `${product.ubicacionLocal}-${product.areaLocal}-${product.lugarLocal}`,
      area: product.area.name,
      mark: product.mark.name,
      model: product.model.name,
      unit: product.unit.name,
      price_c: product.price_c === undefined ? 0 : product.price_c,
    };
  });

  return (
    <>
      <Card>
        <Card.Header as="h5">Lista de productos</Card.Header>
        <Card.Body>
          {showAlert1 && message.type && (
            <Alert onClose={clearAlert1} dismissible variant={message.type}>
              {message.message}
            </Alert>
          )}
          {showAlert2 && message2.type && (
            <Alert onClose={clearAlert2} dismissible variant={message2.type}>
              {message2.message}
            </Alert>
          )}
          {showAlert3 && message3.type && (
            <Alert onClose={clearAlert3} dismissible variant={message3.type}>
              {message3.message}
            </Alert>
          )}
          {resource && resource.canCreate && resource.canUpdate ? (
            <>
              <div className={styles.contentButtons}>
                <div className={styles.contentButtons__add}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => openModalRE(false)}
                  >
                    Agregar producto
                  </Button>
                </div>
                {/* <div className={styles.contentButtons__excel}>
                  <Form.Group className={styles.contentButtons__excel__input}>
                    <CSVLink
                      data={dataFormat}
                      headers={headersFormat}
                      filename="formato.csv"
                      target="_blank"
                      separator={";"}
                    >
                      <Form.Label
                        className={styles.contentButtons__excel__download}
                      >
                        Descargar formato
                      </Form.Label>
                    </CSVLink>
                  </Form.Group>
                  <Form.Group className={styles.contentButtons__excel__input}>
                    <Form.Label
                      htmlFor="file"
                      className={styles.contentButtons__excel__label}
                    >
                      Importar productos desde excel
                    </Form.Label>

                    <Form.Control
                      type="file"
                      onChange={importExcel}
                      style={{ display: "none" }}
                      id="file"
                      title="aa"
                      value={file}
                    />
                  </Form.Group>
                  <Button
                    type="button"
                    variant="dark"
                    //onClick={onSubmitXML}
                    disabled={file ? false : true}
                  >
                    Cargar registros
                  </Button>
                </div> */}
              </div>
              {/* <div className={styles.cantExcel}>
                {registers.length} productos encontrados.
              </div> */}
              <ProductForm
                show={show}
                closeModal={closeModal}
                listProducts={listProducts}
                product={state}
              />
            </>
          ) : resource && resource.canCreate ? (
            <>
              <div className={styles.contentButtons}>
                <div className={styles.contentButtons__add}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => openModalRE(false)}
                  >
                    Agregar producto
                  </Button>
                </div>

                <div className={styles.contentButtons__excel}>
                  <Form.Group className={styles.contentButtons__excel__input}>
                    <CSVLink
                      data={dataFormat}
                      headers={headersFormat}
                      filename="formato.csv"
                      target="_blank"
                      separator={";"}
                    >
                      <Form.Label
                        className={styles.contentButtons__excel__download}
                      >
                        Descargar formato
                      </Form.Label>
                    </CSVLink>
                  </Form.Group>
                  <Form.Group className={styles.contentButtons__excel__input}>
                    <Form.Label
                      htmlFor="file"
                      className={styles.contentButtons__excel__label}
                    >
                      Importar productos desde excel
                    </Form.Label>

                    <Form.Control
                      type="file"
                      onChange={importExcel}
                      style={{ display: "none" }}
                      id="file"
                      title="aa"
                      value={file}
                    />
                  </Form.Group>
                  <Button
                    type="button"
                    variant="dark"
                    //onClick={onSubmitXML}
                    disabled={file ? false : true}
                  >
                    Cargar registros
                  </Button>
                </div>
              </div>
              <div className={styles.cantExcel}>
                {registers.length} productos encontrados.
              </div>
              <ProductForm
                show={show}
                closeModal={closeModal}
                listProducts={listProducts}
                product={state}
              />
            </>
          ) : (
            resource &&
            resource.canUpdate && (
              <ProductForm
                show={show}
                closeModal={closeModal}
                listProducts={listProducts}
                product={state}
              />
            )
          )}

          {resource && resource.canRead && (
            <>
              <div className={styles.contentSearch}>
                <div className={styles.contentSearch__search}>
                  <Search onSearch={onSearch} />
                </div>
                <div className={styles.contentSearch__options}>
                  <CSVLink
                    data={dataExportProducts}
                    headers={formatExportProducts}
                    filename={`productos_${convertDateToUTCLocal(
                      new Date()
                    )}.csv`}
                    target="_blank"
                    separator={";"}
                  >
                    <Button variant="success  " type="button">
                      Exportar productos a excel
                    </Button>
                  </CSVLink>
                </div>
              </div>
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
                    Hay un total de{" "}
                    {search ? productsFiltered.length : products.length}{" "}
                    registros
                  </span>
                </div>
              </div>
              <Table
                striped
                bordered
                hover
                responsive
                className={styles.table}
                size="sm"
              >
                <TableHeader
                  headers={
                    user.role.name === "SUPER ADMINISTRADOR"
                      ? headers
                      : headers.filter((head) => head.field !== "price_c")
                  }
                  onSorting={onSorting}
                />
                <tbody>
                  {productsFiltered.map((pro, item: number) => (
                    <ProductListActive
                      item={item + 1}
                      key={pro._id}
                      product={pro}
                      openModalRE={openModalRE}
                      deleteProd={_deleteProduct}
                      restorePro={_restoreProduct}
                    />
                  ))}
                </tbody>
                {/* <tfoot>
                  {removes.map((remove, item: number) => (
                    <ProductListRemoves
                      item={item + 1}
                      key={remove._id}
                      remove={remove}
                      restorePro={_restoreProduct}
                    />
                  ))}
                </tfoot> */}
              </Table>
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default ProductScreen;
