import type { Req } from "../lib/http.js";
import type { CatalogoService } from "../services/catalogo.service.js";
import type { catalogoValidator } from "../validators/catalogo.validator.js";
import { renderModulo } from "../views/catalogo.view.js";

export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  listarModulos = async () => this.catalogo.listarModulos().map(renderModulo);

  listarChecks = async (req: Req<typeof catalogoValidator.listarChecks>) =>
    this.catalogo.listarChecks(req.query);
}
