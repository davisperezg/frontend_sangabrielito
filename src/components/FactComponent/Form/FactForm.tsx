import {
  ChangeEvent,
  FormEvent,
  memo,
  useEffect,
  useState,
  useMemo,
  useRef,
  KeyboardEvent,
  useContext,
  useCallback,
} from "react";
import { Alert, Button, Col, Form, Modal, Row, Table } from "react-bootstrap";
import { postCreateFact, updateFact } from "../../../api/fact/fact";
import { IAlert } from "../../../interface/IAlert";
import { Fact } from "../../../interface/Fact";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { Client } from "../../../interface/Client";
import { getClients } from "../../../api/client/client";
import { Product } from "../../../interface/Product";
import { getProducts } from "../../../api/product/product";
import { BsFillCartFill } from "react-icons/bs";
import PaginationComponent from "../../DatatableComponent/Pagination/Pagination";
import TableHeader from "../../DatatableComponent/Header/TableHeader";
import styles from "./FactForm.module.scss";
import { IoMdClose } from "react-icons/io";
import { getSequenceFact } from "../../../api/sequence/sequence";
import { AuthContext } from "../../../context/auth";
import {
  getDetailsFacts,
  postCreateDetailsFact,
} from "../../../api/detail-fact/detail";
import DetailItem from "../Detail/Item";
import { DetailsFact } from "../../../interface/DetailsFact";
import { formatter } from "../../../lib/helpers/functions/functions";
import ClientForm from "../../ClientComponent/Form/ClientForm";

const animatedComponents = makeAnimated();

type InputChange = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

type KeyChange = KeyboardEvent<HTMLTableRowElement>;

let selected: any = [];

const FactForm = ({
  show,
  fact,
  closeModal,
  listFacts,
}: {
  show: boolean;
  fact?: Fact;
  closeModal: () => void;
  listFacts: () => void;
}) => {
  const initialStateFact = {
    cod_fact: 0,
    client: "",
    payment_type: "CONTADO",
    way_to_pay: "EFECTIVO COMPLETO",
    subtotal: 0,
    discount: 0,
    customer_payment: 0,
  };

  const initialStateAlert: IAlert = {
    type: "",
    message: "",
  };

  const [form, setForm] = useState<Fact>(initialStateFact);
  const [message, setMessage] = useState<IAlert>(initialStateAlert);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [errors, setErrors] = useState<any>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProducts, setShowProducts] = useState<boolean>(false);
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState<string | any>("");
  const searchInput = useRef<HTMLInputElement | null>(null);
  const searchProducts = useRef<HTMLButtonElement | null>(null);
  const contentDiv = useRef<HTMLFormElement | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [sorting, setSorting] = useState({ field: "", order: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [numberFact, setNumberFact] = useState(0);
  const [selectCliente, setSelectClient] = useState<any>({
    label: "",
    value: "",
  });
  const { user } = useContext(AuthContext);
  const [showMoney, setShowMoney] = useState(false);
  const [showModalClient, setShowModalClient] = useState(false);

  const handleCloseModalMoney = () => {
    setShowMoney(false);
    setDisabled(false);
    setForm({ ...form, customer_payment: 0, subtotal: 0 });
  };
  const handleShowModalMoney = () => {
    setShowMoney(true);
    setForm({ ...form, subtotal: calSumSub() - form.discount });
  };

  const handleButtonFF = () => {
    if (form.customer_payment === 0) {
      setMessage({
        type: "info",
        message: `Si el cliente esta pagando con 0 soles, por favor cierre la ventana y cambie a la forma de pago a: "EFECTIVO COMPLETO"`,
      });
    } else {
      saveFactAndDetail();
      handleCloseModalMoney();
    }
  };

  const ITEMS_PER_PAGE = 5;

  const headers = [
    { name: "Cod Barra/interno", field: "cod_internal", sortable: true },
    { name: "Producto", field: "name", sortable: true },
    { name: "Marca", field: "mark", sortable: true },
    { name: "Modelo", field: "model", sortable: true },
    { name: "Unidad", field: "unit", sortable: true },
    { name: "Stock", field: "stock", sortable: true },
    { name: "Precio", field: "price", sortable: true },
    { name: "Añadir", field: "actiones", sortable: false },
  ];

  const handleSearch = () => {
    setSearch(searchInput.current?.value);
    setCurrentPage(1);
  };

  const getFac = async () => {
    const res = await getSequenceFact(user.area._id);
    const { data } = res;
    setNumberFact(data.sequence);
  };

  const listClients = async () => {
    const res = await getClients();
    const { data } = res;
    const filter = data.map((cli: any) => {
      return {
        label: cli.name + " " + cli.lastname,
        value: cli.nroDocument,
      };
    });
    const getClientNO = filter.find((find: any) => find.value === "00000000");
    setForm({ ...form, client: getClientNO.value });
    setSelectClient({ label: getClientNO.label, value: getClientNO.value });
    setClients(filter);
  };

  const listProducts = async () => {
    const res = await getProducts();
    const { data } = res;
    setProducts(data);
  };

  const productsFiltered = useMemo(() => {
    let computedProducts = products;

    if (search) {
      computedProducts = computedProducts.filter((product) => {
        return (
          product.cod_internal.toLowerCase().includes(search.toLowerCase()) ||
          product.name.toLowerCase().includes(search.toLowerCase())
        );
      });
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
  }, [products, search, currentPage, sorting]);

  const onPageChange = (page: number) => setCurrentPage(page);

  const onSorting = (field: string, order: string) =>
    setSorting({ field, order });

  const getDate = () => {
    const date = new Date();
    let value: string = "";

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    if (month < 10) {
      value = `${day}-0${month}-${year}`;
    } else {
      value = `${day}-${month}-${year}`;
    }
    return value;
  };

  const closeAndClear = () => {
    setForm({ ...initialStateFact, client: selectCliente.value });
    closeModal();
    setMessage(initialStateAlert);
    setErrors({});
    setSearch("");
    setShowProducts(false);
    setList([]);
    selected = [];
    setDisabled(false);
  };

  const findFormErrors = () => {
    //const { name } = form;
    const newErrors: any = {};
    // name errors
    //if (!name || name === "") newErrors.name = "Por favor ingrese el nombre.";

    return newErrors;
  };

  const handleChange = (e: InputChange) => {
    setMessage(initialStateAlert);
    if (!!errors[e.target.name])
      setErrors({
        ...errors,
        [e.target.name]: null,
      });
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "discount" || e.target.name === "customer_payment"
          ? Number(e.target.value)
          : e.target.value,
    });
  };

  const onSubmit = async () => {
    //e.preventDefault();
    const newErrors = findFormErrors();
    setMessage(initialStateAlert);
    if (Object.keys(newErrors).length > 0) {
      // We got errors!
      setErrors(newErrors);
    } else {
      setDisabled(true);
      if (form?._id) {
        try {
          const res = await updateFact(form!._id, form);
          const { factUpdated } = res.data;
          setMessage({
            type: "success",
            message: `La factura ${factUpdated.name} ha sido actualizado existosamente.`,
          });
          setDisabled(false);
          listFacts();
        } catch (e) {
          setDisabled(false);
          const error: any = e as Error;
          const msg = error.response.data;
          setMessage({ type: "danger", message: msg.message });
        }
      } else {
        if (list.length <= 0) {
          setMessage({
            type: "danger",
            message: `No hay productos agregados.`,
          });
          setDisabled(false);
          return;
        }
        try {
          if (form.way_to_pay === "EFECTIVO CON VUELTO") {
            handleShowModalMoney();
            return;
          }
          saveFactAndDetail();
        } catch (e) {
          setDisabled(false);
          const error: any = e as Error;
          const msg = error.response.data;
          setMessage({ type: "danger", message: msg.message });
        }
      }
      setErrors({});
    }
  };

  const saveFactAndDetail = async () => {
    await postCreateFact({
      ...form,
      cod_fact: numberFact,
      subtotal: calSumSub(),
    });
    for (let i = 0; i < list.length; i++) {
      const addProduct = {
        fact: numberFact,
        product: list[i].product,
        quantity: list[i].quantity,
        price: list[i].price,
        discount: list[i].discount,
      };
      await postCreateDetailsFact(addProduct);
    }
    getFac();
    setMessage({
      type: "success",
      message: `La venta ha sido registrado existosamente.`,
    });
    //setForm({ ...initialStateFact, client: selectCliente.value });
    setList([]);
    const getClientNO: any = clients.find(
      (find: any) => find.value === "00000000"
    );
    setForm({ ...initialStateFact, client: getClientNO!.value });
    setSelectClient({
      label: getClientNO!.label,
      value: getClientNO!.value,
    });
    setDisabled(false);
    listFacts();
  };

  const onKeyDownDiv = (e: any) => {
    if (!showProducts) {
      if (e.key === "Enter") {
        setShowProducts(true);
        setSearch("");
        setCurrentPage(1);
      }
    }
  };

  const handleKeyDownInput = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "F2") {
      setSearch("");
      setCurrentPage(1);
    }

    if (e.key === "Escape") {
      setShowProducts(false);
      searchProducts.current!.focus();
      setSearch("");
      setCurrentPage(1);
    }
  };

  const handleKeyDownButton = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "F2") {
      setSearch("");
      setCurrentPage(1);
      searchInput.current!.focus();
    }

    if (e.key === "Escape") {
      setShowProducts(false);
      searchProducts.current!.focus();
    }
  };

  const handleKeyDownTr = (e: KeyChange, pro: any) => {
    if (e.key === "Enter") {
      const item = {
        fact: numberFact,
        cod_internal: pro.cod_internal,
        product: String(pro!._id),
        quantity: 1,
        price: pro.price,
        discount: 0,
        name: pro.name,
        unit: pro.unit.name,
      };
      if (selected.length > 0) {
        const isFound = selected.find(
          (product: any) => product.product === item.product
        );
        if (!isFound) {
          selected.push(item);
        }
      } else {
        if (list.length > 0) {
          const isFound = list.find(
            (product: any) => product.product === item.product
          );
          if (!isFound) {
            setList([...list, item]);
          }
          return;
        } else {
          selected.push(item);
        }
      }
      const allSelected = selected.map((product: Product) => product);
      setList(allSelected);
    }
    if (e.key === "Escape") {
      setShowProducts(false);
      searchProducts.current!.focus();
    }

    if (e.key === "F2") {
      setSearch("");
      setCurrentPage(1);
      searchInput.current!.focus();
    }
  };

  const handleClickList = (pro: any) => {
    const item = {
      fact: numberFact,
      cod_internal: pro.cod_internal,
      product: String(pro!._id),
      quantity: 1,
      price: pro.price,
      discount: 0,
      name: pro.name,
      unit: pro.unit.name,
    };

    if (selected.length > 0) {
      const isFound = selected.find(
        (product: any) => product.product === item.product
      );
      if (!isFound) {
        selected.push(item);
      }
    } else {
      if (list.length > 0) {
        const isFound = list.find(
          (product: any) => product.product === item.product
        );
        if (!isFound) {
          setList([...list, item]);
        }
        return;
      } else {
        selected.push(item);
      }
    }
    const allSelected = selected.map((product: Product) => product);
    setList(allSelected);
  };

  const deleteItem = (id: string) => {
    const filterItemDeleted = list.filter((item: any) => item.product !== id);
    setList(filterItemDeleted);
  };

  const getProductByItem = (item: any[]) => {
    setList(item);
  };

  const calSumSub = () => {
    return list.reduce(
      (previousValue: any, currentValue: any) =>
        previousValue +
        currentValue.price * currentValue.quantity -
        currentValue.discount,

      0
    );
  };

  const closeModalClient = () => setShowModalClient(false);

  const openModalClient = () => setShowModalClient(true);

  const getFactById = useCallback(async () => {
    setForm({
      cod_fact: fact?.cod_fact || 0,
      client: String(fact?.client.value) || "",
      payment_type: fact?.payment_type || "",
      way_to_pay: fact?.way_to_pay || "",
      subtotal: fact?.subtotal || 0,
      discount: fact?.discount || 0,
      customer_payment: fact?.customer_payment || 0,
    });
    setNumberFact(fact?.cod_fact || 0);
    const res = await getDetailsFacts(String(fact?._id));
    const filter = res.data.map((detail: any) => {
      return {
        fact: detail.fact.cod_fact,
        cod_internal: detail.product.cod_internal,
        product: detail.product._id,
        quantity: detail.quantity,
        price: detail.price,
        discount: detail.discount,
        name: detail.product.name,
        unit: detail.product.unit.name,
      };
    });
    setList(filter);
  }, [
    fact?.cod_fact,
    fact?.client,
    fact?.payment_type,
    fact?.way_to_pay,
    fact?.subtotal,
    fact?.discount,
    fact?.customer_payment,
  ]);

  useEffect(() => {
    if (fact?._id) {
      getFactById();
      return;
    }
    getFac();
    listClients();
    listProducts();
  }, [getFactById, getFactById, fact?._id]);

  return (
    <div onKeyDown={onKeyDownDiv}>
      <Modal show={showMoney} onHide={handleCloseModalMoney} centered>
        <Modal.Header closeButton style={{ background: "yellow" }}>
          <Modal.Title>EFECTIVO CON VUELTO</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group as={Row} className="mb-3" controlId="formHorizontalTotal">
            <Form.Label column sm={6}>
              Total a pagar (S/)
            </Form.Label>
            <Col sm={6}>
              <Form.Control
                name="subtotal"
                type="number"
                defaultValue={`${formatter.format(form.subtotal)}`}
                disabled
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3" controlId="formHorizontalPaga">
            <Form.Label column sm={6}>
              Paga con (S/)
            </Form.Label>
            <Col sm={6}>
              <Form.Control
                type="number"
                name="customer_payment"
                value={form.customer_payment}
                onChange={handleChange}
              />
            </Col>
          </Form.Group>
          <Form.Group
            as={Row}
            className="mb-3"
            controlId="formHorizontalVuelto"
          >
            <Form.Label column sm={6}>
              Vuelto (S/)
            </Form.Label>
            <Col sm={6}>
              <Form.Control
                type="number"
                value={
                  form.customer_payment
                    ? `${formatter.format(
                        Number(form.subtotal) - Number(form.customer_payment)
                      )}`
                    : formatter.format(0)
                }
                disabled
                min="0"
              />
            </Col>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModalMoney}>
            Cerrar
          </Button>
          <Button variant="success" onClick={handleButtonFF}>
            Finalizar venta
          </Button>
        </Modal.Footer>
      </Modal>

      <ClientForm
        show={showModalClient}
        closeModal={closeModalClient}
        listClients={listClients}
      />

      <Modal
        show={show}
        onHide={closeAndClear}
        backdrop="static"
        keyboard={false}
        top="true"
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>{form?._id ? "Ver Venta" : "Nueva Venta"}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={onSubmit} ref={contentDiv}>
          <Modal.Body>
            {message.type && (
              <Alert variant={message.type}>{message.message}</Alert>
            )}

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{ width: "100%", display: "flex", flexDirection: "row" }}
              >
                <div style={{ width: "70%" }}>
                  <Row className="mb-3">
                    <Form.Group md="3" as={Col} controlId="formGridFech">
                      <Form.Label>Fecha</Form.Label>
                      <Form.Control
                        name="fech"
                        value={getDate()}
                        type="text"
                        disabled
                      />
                    </Form.Group>
                    <Form.Group md="8" as={Col} controlId="formGridType">
                      <Form.Label>Tipo de pago</Form.Label>
                      <Form.Select
                        name="payment_type"
                        onChange={handleChange}
                        value={form?.payment_type}
                        isInvalid={!!errors?.payment_type}
                        disabled={fact?._id ? true : false}
                      >
                        <option value="CONTADO">CONTADO</option>
                        <option value="CREDITO">CREDITO</option>
                      </Form.Select>
                    </Form.Group>
                  </Row>
                  <Row className="mb-3">
                    <Form.Group md="7" as={Col} controlId="formGridFech">
                      <Form.Label>
                        Cliente{" "}
                        {!fact?._id && (
                          <strong
                            style={{ cursor: "pointer" }}
                            className="text-primary"
                            onClick={openModalClient}
                          >
                            Registrar cliente
                          </strong>
                        )}
                      </Form.Label>
                      <Select
                        isDisabled={fact?._id ? true : false}
                        closeMenuOnSelect={true}
                        components={animatedComponents}
                        value={
                          form.client === ""
                            ? []
                            : {
                                label: fact?._id
                                  ? String(fact?.client.label)
                                  : selectCliente.label,
                                value: fact?._id
                                  ? String(fact.client.value)
                                  : selectCliente.value,
                              }
                        }
                        onChange={(values: any) => {
                          setMessage(initialStateAlert);
                          const { label, value } = values;
                          setSelectClient({ label, value });
                          setForm({ ...form, client: value });
                        }}
                        options={clients}
                      />
                    </Form.Group>
                    <Form.Group md="4" as={Col} controlId="formGridType">
                      <Form.Label>Forma de pago</Form.Label>
                      <Form.Select
                        name="way_to_pay"
                        onChange={handleChange}
                        value={form?.way_to_pay}
                        isInvalid={!!errors?.way_to_pay}
                        disabled={fact?._id ? true : false}
                      >
                        <option value="EFECTIVO COMPLETO">
                          EFECTIVO COMPLETO
                        </option>
                        <option value="EFECTIVO CON VUELTO">
                          EFECTIVO CON VUELTO
                        </option>
                        <option value="YAPE">YAPE</option>
                        <option value="PLIN">PLIN</option>
                      </Form.Select>
                    </Form.Group>
                  </Row>
                </div>
                <div style={{ width: "30%" }}>
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        textAlign: "center",
                        flexDirection: "column",
                        padding: 20,
                        border: "1px solid #000",
                      }}
                    >
                      <h3>RUC: 10443373824</h3>
                      <h3>
                        <strong>GUIA DE VENTA</strong>
                      </h3>
                      <h3>N° 000{numberFact}</h3>
                    </div>
                  </div>
                </div>
              </div>
              <div></div>
              <Table striped bordered hover responsive="sm" className="mt-3">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cod Barra/interno</th>
                    <th>Producto</th>
                    <th>U. Medida</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Descuento</th>
                    <th>Total</th>
                    {!fact?._id && <th className="text-center">Eliminar</th>}
                  </tr>
                </thead>
                <tbody>
                  {fact?._id
                    ? list.map((listed, i: number) => (
                        <DetailItem
                          key={listed.product}
                          listed={listed}
                          item={i}
                          list={list}
                          view={true}
                        />
                      ))
                    : list.map((listed, i: number) => (
                        <DetailItem
                          key={listed.product}
                          listed={listed}
                          item={i}
                          list={list}
                          deleteItem={deleteItem}
                          numberFact={numberFact}
                          getProductByItem={getProductByItem}
                        />
                      ))}
                  {!fact?._id && (
                    <tr>
                      <td>
                        <button
                          className="btn btn-success"
                          type="button"
                          onClick={() => {
                            setMessage(initialStateAlert);
                            setShowProducts(!showProducts);
                          }}
                          style={{
                            width: 40,
                            height: 40,
                          }}
                          ref={searchProducts}
                        >
                          <strong>+</strong>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      <strong>SubTotal</strong>
                    </td>
                    <td>{`S/ ${formatter.format(calSumSub())}`}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      <strong>Descuento</strong>
                    </td>
                    <td>
                      <Form.Control
                        name="discount"
                        value={form.discount}
                        type="number"
                        disabled={fact?._id ? true : false}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td>{`S/ ${formatter.format(
                      calSumSub() - form.discount
                    )}`}</td>
                  </tr>
                  {fact?._id && form.way_to_pay === "EFECTIVO CON VUELTO" && (
                    <>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>
                          <strong>Pagó con</strong>
                        </td>
                        <td>{`S/ -${formatter.format(
                          form.customer_payment
                        )}`}</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>
                          <strong>Vuelto</strong>
                        </td>
                        <td>{`S/ ${formatter.format(
                          form.subtotal - form.customer_payment
                        )}`}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </Table>
              {showProducts && (
                <div
                  style={{
                    boxShadow:
                      "0 16px 32px rgb(55 71 79 / 8%), 0 8px 24px rgb(55 71 79 / 10%)",
                    background: "#fff",
                    position: "absolute",
                    width: "900px",
                    top: "270px",
                    left: "110px",
                    height: "auto",
                    display: "flex",
                    flexDirection: "column",
                    padding: 10,
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    className="p-1"
                    placeholder="Introduce Cod. de barra / interno o nombre del producto"
                    value={search}
                    ref={searchInput}
                    onChange={handleSearch}
                    onKeyDown={handleKeyDownInput}
                  />
                  <Table
                    striped
                    bordered
                    hover
                    responsive="sm"
                    className="mt-3"
                  >
                    <TableHeader headers={headers} onSorting={onSorting} />
                    <tbody>
                      {productsFiltered.map((pro: any) => {
                        return (
                          <tr
                            tabIndex={0}
                            key={pro._id}
                            onKeyDown={(e) => handleKeyDownTr(e, pro)}
                            className={styles.tr}
                          >
                            <td>{pro.cod_internal}</td>
                            <td>{pro.name}</td>
                            <td>{pro.mark.name}</td>
                            <td>{pro.model.name}</td>
                            <td>{pro.unit.name}</td>
                            <td>{pro.stock}</td>
                            <td>S/ {pro.price}</td>
                            <td className="text-center">
                              <BsFillCartFill
                                type="button"
                                onClick={() => handleClickList(pro)}
                                className="text-success font-weight-bold"
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex" }}>
                      <Button
                        onKeyDown={handleKeyDownButton}
                        variant="danger"
                        onClick={() => {
                          setShowProducts(false);
                          selected = [];
                        }}
                      >
                        Cerrar
                      </Button>
                    </div>
                    <div style={{ display: "flex" }}>
                      <PaginationComponent
                        total={totalItems}
                        itemsPerPage={ITEMS_PER_PAGE}
                        currentPage={currentPage}
                        onPageChange={onPageChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={closeAndClear}>
              Cerrar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={disabled}
              onClick={onSubmit}
            >
              {fact?._id ? "Imprimir" : "Registrar"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default memo(FactForm);
